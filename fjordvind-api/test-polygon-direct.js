async function testPolygonDirect() {
  try {
    console.log('Fetching polygons with plassering and vannmiljo fields...\n');

    const url = 'https://gis.fiskeridir.no/server/services/FiskeridirWFS_akva/MapServer/WFSServer?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=FiskeridirWFS_akva:Flate_ihht_Akvakulturregisteret&OUTPUTFORMAT=GEOJSON&COUNT=50&propertyName=loknr,navn,plassering,vannmiljo';

    const response = await fetch(url);
    let text = await response.text();

    // Fix malformed JSON
    text = text.replace(/"type":"MultiPolygon",}/g, '"type":"MultiPolygon","coordinates":[]}');
    text = text.replace(/"type":"Polygon",}/g, '"type":"Polygon","coordinates":[]}');

    const data = JSON.parse(text);

    console.log(`Total features: ${data.features.length}\n`);

    // Count by type
    const stats = {
      sjoSaltvann: 0,
      landFerskvann: 0,
      landSaltvann: 0,
      other: 0
    };

    console.log('Sample facilities:\n');
    data.features.slice(0, 10).forEach((f, i) => {
      const p = f.properties;
      console.log(`${i + 1}. ${p.navn || 'N/A'} (loknr: ${p.loknr})`);
      console.log(`   Plassering: ${p.plassering}, Vannmiljo: ${p.vannmiljo}`);

      if (p.plassering === 'SJØ' && p.vannmiljo === 'SALTVANN') {
        stats.sjoSaltvann++;
      } else if (p.plassering === 'LAND' && p.vannmiljo === 'FERSKVANN') {
        stats.landFerskvann++;
      } else if (p.plassering === 'LAND' && p.vannmiljo === 'SALTVANN') {
        stats.landSaltvann++;
      } else {
        stats.other++;
      }
    });

    console.log('\n=== STATS ===');
    console.log(`SJØ + SALTVANN (keep - marine lice): ${stats.sjoSaltvann}`);
    console.log(`LAND + FERSKVANN (remove - NO lice): ${stats.landFerskvann}`);
    console.log(`LAND + SALTVANN (keep - RAS saltwater): ${stats.landSaltvann}`);
    console.log(`Other: ${stats.other}`);

    // Now search for Rjukan II in a larger dataset
    console.log('\n\n=== SEARCHING FOR RJUKAN II ===');

    const url2 = 'https://gis.fiskeridir.no/server/services/FiskeridirWFS_akva/MapServer/WFSServer?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=FiskeridirWFS_akva:Flate_ihht_Akvakulturregisteret&OUTPUTFORMAT=GEOJSON&COUNT=10000&propertyName=loknr,navn,plassering,vannmiljo';

    const response2 = await fetch(url2);
    let text2 = await response2.text();

    text2 = text2.replace(/"type":"MultiPolygon",}/g, '"type":"MultiPolygon","coordinates":[]}');
    text2 = text2.replace(/"type":"Polygon",}/g, '"type":"Polygon","coordinates":[]}');

    const data2 = JSON.parse(text2);

    console.log(`Loaded ${data2.features.length} features\n`);

    const rjukan = data2.features.filter(f =>
      f.properties.navn && f.properties.navn.toLowerCase().includes('rjukan')
    );

    if (rjukan.length > 0) {
      console.log('Found Rjukan facilities:');
      rjukan.forEach(f => {
        const p = f.properties;
        console.log(`\n${p.navn} (loknr: ${p.loknr})`);
        console.log(`  Plassering: ${p.plassering}`);
        console.log(`  Vannmiljo: ${p.vannmiljo}`);

        if (p.plassering === 'LAND' && p.vannmiljo === 'FERSKVANN') {
          console.log('  ➡️  SHOULD BE FILTERED OUT (land-based freshwater - no lice)');
        } else {
          console.log('  ➡️  KEEP (lice-relevant)');
        }
      });
    } else {
      console.log('No Rjukan facilities found in dataset');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testPolygonDirect();
