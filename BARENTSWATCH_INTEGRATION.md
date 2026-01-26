# BarentsWatch Integrasjon for Lusevokteren

## Oversikt

Dette dokumentet beskriver hvordan du integrerer BarentsWatch Fish Health API for å vise nabooppdrett og mer detaljert kartdata.

## Hva er BarentsWatch?

BarentsWatch er en norsk tjeneste som gir tilgang til sanntidsdata om fiskehelse, oppdrettslokaliteter, lakselus, sykdommer og mer.

**Tilgjengelige data:**
- 📍 Alle oppdrettslokaliteter i Norge med koordinater
- 🐟 Lusedata for samtlige oppdrett
- 🚢 Båttrafikk ved anlegg
- ⚠️ Rømming og sykdomsdata
- 📊 Historisk data tilbake til 2012

## Eksempel: Klongsholmen

I databasen har vi nå lagt til Klongsholmen som lokalitet:

```sql
-- Koordinater for Klongsholmen (Osterfjorden)
Latitude: 60.5833°N
Longitude: 5.4167°E
Lokalitetsnummer: 10455
```

**Merder ved Klongsholmen:**
- NF-A1, NF-A2, NF-B1 (eksisterende)
- KH-C1, KH-C2 (nye)

**Nabooppdrett:**
- Øygarden Nord (60.59°N, 5.43°E) - ca 1 km unna
- Osterøy Sør (60.57°N, 5.40°E) - ca 2 km unna

## Hvordan komme i gang med BarentsWatch API

### Steg 1: Registrer applikasjon

1. Gå til [https://developer.barentswatch.no](https://developer.barentswatch.no)
2. Opprett en bruker
3. Registrer din applikasjon
4. Få API-nøkkel (Client ID og Client Secret)

### Steg 2: Autentisering

BarentsWatch bruker **OpenID Connect** for autentisering. Du må utveksle dine credentials for et access token:

```javascript
// Eksempel: Hent access token
const getAccessToken = async () => {
  const response = await fetch('https://id.barentswatch.no/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.BARENTSWATCH_CLIENT_ID,
      client_secret: process.env.BARENTSWATCH_CLIENT_SECRET,
      scope: 'api',
    }),
  });

  const data = await response.json();
  return data.access_token;
};
```

### Steg 3: Hent lokalitetsdata

```javascript
// Hent alle oppdrettslokaliteter
const fetchFishFarms = async (accessToken) => {
  const response = await fetch(
    'https://www.barentswatch.no/bwapi/v1/geodata/fishhealth/locality',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();
  return data;
};
```

### Steg 4: Finn nabooppdrett basert på koordinater

```javascript
// Finn oppdrett innenfor en viss radius
const findNearbyFarms = (centerLat, centerLng, radiusKm, allFarms) => {
  return allFarms.filter(farm => {
    const distance = calculateDistance(
      centerLat, centerLng,
      farm.latitude, farm.longitude
    );
    return distance <= radiusKm;
  });
};

// Haversine-formel for distanse
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Jordens radius i km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => deg * (Math.PI / 180);
```

## Integrasjon i Lusevokteren

### Backend (Express API)

Legg til nytt endpoint i [server.js](lusevokteren-api/server.js):

```javascript
// Get nearby farms from BarentsWatch
app.get('/api/nearby-farms', async (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query;

    // Hent BarentsWatch token
    const token = await getBarentsWatchToken();

    // Hent alle lokaliteter fra BarentsWatch
    const farms = await fetchBarentsWatchLocalities(token);

    // Filtrer på nærhet
    const nearbyFarms = findNearbyFarms(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius),
      farms
    );

    res.json(nearbyFarms);
  } catch (error) {
    console.error('Error fetching nearby farms:', error);
    res.status(500).json({ error: 'Failed to fetch nearby farms' });
  }
});
```

### Frontend (React)

Oppdater [MapView.jsx](lusevokteren-web/src/components/MapView.jsx) til å vise BarentsWatch-data:

```javascript
const [nearbyFarms, setNearbyFarms] = useState([]);

useEffect(() => {
  const loadNearbyFarms = async () => {
    const response = await fetch(
      `${API_URL}/api/nearby-farms?latitude=${center.lat}&longitude=${center.lng}&radius=10`
    );
    const data = await response.json();
    setNearbyFarms(data);
  };

  if (center.lat && center.lng) {
    loadNearbyFarms();
  }
}, [center]);
```

## Kartbibliotek

For bedre kartvisning, anbefaler vi å bruke et av disse bibliotekene:

### 1. Leaflet (Anbefalt - Open Source)

```bash
npm install leaflet react-leaflet
```

```javascript
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

<MapContainer center={[60.5833, 5.4167]} zoom={13}>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; OpenStreetMap contributors'
  />
  {cages.map(cage => (
    <Marker key={cage.id} position={[cage.latitude, cage.longitude]}>
      <Popup>
        <strong>{cage.navn}</strong><br/>
        Lusestatus: {cage.avg_adult_female}
      </Popup>
    </Marker>
  ))}
</MapContainer>
```

### 2. Mapbox (Kommersielt - Bra styling)

```bash
npm install mapbox-gl react-map-gl
```

Krever API-nøkkel fra [mapbox.com](https://mapbox.com)

### 3. Google Maps (Kommersielt)

Krever Google Maps API-nøkkel

## Miljøvariabler

Legg til i `.env`-filen:

```env
# BarentsWatch
BARENTSWATCH_CLIENT_ID=din_client_id_her
BARENTSWATCH_CLIENT_SECRET=din_client_secret_her

# Mapbox (valgfritt)
MAPBOX_ACCESS_TOKEN=din_mapbox_token_her
```

## Nyttige lenker

- **BarentsWatch Developer Portal:** https://developer.barentswatch.no
- **Fish Health API Docs:** https://developer.barentswatch.no/docs/fishhealth
- **OpenAPI Spec:** https://www.barentswatch.no/bwapi/openapi/fishhealth/openapi.json
- **Leaflet:** https://leafletjs.com
- **React Leaflet:** https://react-leaflet.js.org

## Eksempel på komplett flyt

1. Bruker åpner kartsiden (`/map`)
2. Frontend henter egne merder fra databasen (koordinater)
3. Frontend kaller `/api/nearby-farms` med koordinater
4. Backend autentiserer mot BarentsWatch
5. Backend henter alle lokaliteter fra BarentsWatch API
6. Backend beregner avstand og returnerer nabooppdrett innenfor radius
7. Frontend viser både egne merder og nabooppdrett på kartet
8. Bruker kan klikke på markers for å se detaljer

## Lisens

BarentsWatch data er tilgjengelig under **NLOD** (Norwegian Licence for Open Government Data).

---

**Tips:** Start med en enkel SVG-basert kartvisning (som vi har nå), og bytt til Leaflet når du er klar for produksjon.
