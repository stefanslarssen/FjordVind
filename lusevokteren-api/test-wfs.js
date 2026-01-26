async function testWFS() {
  try {
    // Hent de første 20 lokalitetene
    const url = 'https://gis.fiskeridir.no/server/services/FiskeridirWFS_akva/MapServer/WFSServer?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=FiskeridirWFS_akva:akvakultur_lokaliteter&OUTPUTFORMAT=GEOJSON&COUNT=20';

    const response = await fetch(url);
    const data = await response.json();

    console.log('\n=== SAMPLE WFS DATA ===\n');
    console.log(`Total features returned: ${data.features.length}\n`);

    // Vis de første 5 og tell typer
    const prodTypes = new Map();

    data.features.forEach((f, i) => {
      const prodForm = f.properties?.produksjonsform || 'UNKNOWN';
      const plassering = f.properties?.plassering || 'UNKNOWN';
      const vannmiljo = f.properties?.vannmiljo || 'UNKNOWN';

      const key = `${prodForm} | ${plassering} | ${vannmiljo}`;
      prodTypes.set(key, (prodTypes.get(key) || 0) + 1);

      if (i < 5) {
        console.log(`Feature ${i + 1}:`);
        console.log(`  loknr: ${f.properties.loknr}`);
        console.log(`  navn: ${f.properties.lokalitetnavn}`);
        console.log(`  produksjonsform: ${prodForm}`);
        console.log(`  plassering: ${plassering}`);
        console.log(`  vannmiljo: ${vannmiljo}`);
        console.log('');
      }
    });

    console.log('\n=== DISTRIBUTION (first 20 features) ===');
    for (const [key, count] of prodTypes.entries()) {
      console.log(`${key}: ${count}`);
    }

    // Nå test spesifikt for Rjukan II
    console.log('\n=== SEARCHING FOR RJUKAN II (loknr: 36977) ===');
    const fullUrl = 'https://gis.fiskeridir.no/server/services/FiskeridirWFS_akva/MapServer/WFSServer?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=FiskeridirWFS_akva:akvakultur_lokaliteter&OUTPUTFORMAT=GEOJSON&CQL_FILTER=loknr=36977';

    const rjukanResponse = await fetch(fullUrl);
    const rjukanData = await rjukanResponse.json();

    if (rjukanData.features && rjukanData.features.length > 0) {
      const f = rjukanData.features[0];
      console.log('Found Rjukan II:');
      console.log(`  loknr: ${f.properties.loknr}`);
      console.log(`  navn: ${f.properties.lokalitetnavn}`);
      console.log(`  produksjonsform: ${f.properties.produksjonsform}`);
      console.log(`  plassering: ${f.properties.plassering}`);
      console.log(`  vannmiljo: ${f.properties.vannmiljo}`);

      const prodForm = f.properties?.produksjonsform || '';
      const plassering = f.properties?.plassering || '';
      const vannmiljo = f.properties?.vannmiljo || '';

      console.log('\nShould be filtered out?');
      if (prodForm.toLowerCase().includes('settefisk') || prodForm.toLowerCase().includes('stamfisk')) {
        console.log('  YES - because produksjonsform contains settefisk/stamfisk');
      } else if (plassering === 'LAND' && vannmiljo === 'FERSKVANN') {
        console.log('  YES - because it is LAND + FERSKVANN');
      } else {
        console.log('  NO - does not match filter criteria');
        console.log('  This locality WILL appear in the map');
      }
    } else {
      console.log('Rjukan II not found');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testWFS();
