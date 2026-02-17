# Frontend-oppdateringer for RLS

Etter at SQL-migrasjonen er kjørt, må frontend oppdateres.

## 1. Legg til organization helper i supabase.js

```javascript
// Hent brukerens organisasjon
export async function getUserOrganization() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(id, name)')
    .eq('user_id', user.id)
    .single()

  if (error) return null
  return data
}

// Cache organisasjon-ID
let cachedOrgId = null

export async function getOrganizationId() {
  if (cachedOrgId) return cachedOrgId

  const org = await getUserOrganization()
  cachedOrgId = org?.organization_id
  return cachedOrgId
}

// Nullstill cache ved utlogging
export function clearOrgCache() {
  cachedOrgId = null
}
```

## 2. Oppdater createSample()

```javascript
export async function createSample(data) {
  const orgId = await getOrganizationId()

  const { data: result, error } = await supabase
    .from('samples')
    .insert({
      ...data,
      organization_id: orgId  // <-- LEGG TIL
    })
    .select()

  if (error) throw new Error('Failed to create sample')
  return result
}
```

## 3. Oppdater createCage()

```javascript
export async function createCage(data) {
  const orgId = await getOrganizationId()

  const { data: result, error } = await supabase
    .from('merds')
    .insert({
      navn: data.name,
      merd_id: data.merdId || null,
      lokalitet: data.locationName,
      location_id: data.locationId || null,
      organization_id: orgId  // <-- LEGG TIL
    })
    .select()

  if (error) throw new Error('Failed to create cage')
  return result?.[0]
}
```

## 4. Oppdater createLocation()

```javascript
export async function createLocation(data) {
  const orgId = await getOrganizationId()

  const { data: result, error } = await supabase
    .from('locations')
    .insert({
      name: data.name,
      lokalitetsnummer: data.lokalitetsnummer || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      municipality: data.municipality || null,
      owner: data.owner || null,
      organization_id: orgId  // <-- LEGG TIL
    })
    .select()

  if (error) throw new Error('Failed to create location')
  return result?.[0]
}
```

## 5. Oppdater createEnvironmentReading()

```javascript
export async function createEnvironmentReading(data) {
  const orgId = await getOrganizationId()

  const { data: result, error } = await supabase
    .from('environment_readings')
    .insert({
      merd_id: data.merdId || null,
      locality: data.locality,
      temperature_celsius: data.temperature,
      oxygen_percent: data.oxygen,
      salinity_ppt: data.salinity,
      ph: data.ph,
      timestamp: data.timestamp || new Date().toISOString(),
      is_anomaly: false,
      organization_id: orgId  // <-- LEGG TIL
    })
    .select()

  if (error) throw new Error('Failed to create environment reading')
  return result
}
```

## 6. Oppdater auth.js signOut()

```javascript
import { clearOrgCache } from './supabase'

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) console.error('Sign out error:', error)
  setStoredUser(null)
  clearOrgCache()  // <-- LEGG TIL
}
```

## 7. Legg til i AuthContext (contexts/AuthContext.jsx)

Vis organisasjonsnavn i UI:

```javascript
const [organization, setOrganization] = useState(null)

useEffect(() => {
  if (user) {
    getUserOrganization().then(setOrganization)
  } else {
    setOrganization(null)
  }
}, [user])
```

## Testing

1. Opprett to testbrukere med forskjellige firmaer
2. Logg inn som bruker A, opprett en merd
3. Logg inn som bruker B, verifiser at merden IKKE vises
4. Logg inn som bruker A igjen, verifiser at merden vises
