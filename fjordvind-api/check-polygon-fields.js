async function checkPolygonFields() {
  try {
    const url = 'https://gis.fiskeridir.no/server/services/FiskeridirWFS_akva/MapServer/WFSServer?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=FiskeridirWFS_akva:Flate_ihht_Akvakulturregisteret&OUTPUTFORMAT=GEOJSON&COUNT=5';

    const response = await fetch(url);
    let text = await response.text();

    // Fix malformed JSON
    text = text.replace(/"type":"MultiPolygon",}/g, '"type":"MultiPolygon","coordinates":[]}');
    text = text.replace(/"type":"Polygon",}/g, '"type":"Polygon","coordinates":[]}');

    const data = JSON.parse(text);

    console.log('\n=== POLYGON LAYER PROPERTIES ===\n');
    console.log('Total features:', data.features.length);

    if (data.features.length > 0) {
      const firstFeature = data.features[0];
      console.log('\nAll property keys in first feature:');
      console.log(Object.keys(firstFeature.properties).join(', '));

      console.log('\n\nFirst feature sample:');
      console.log(JSON.stringify(firstFeature.properties, null, 2));

      // Søk etter Rjukan
      console.log('\n\n=== SEARCHING FOR RJUKAN FACILITIES ===');
      const allRjukan = data.features.filter(f =>
        f.properties.loknam && f.properties.loknam.toLowerCase().includes('rjukan')
      );

      if (allRjukan.length > 0) {
        allRjukan.forEach(f => {
          console.log('\nFound:', f.properties.loknam);
          console.log('  loknr:', f.properties.loknr);
          console.log('  All properties:', JSON.stringify(f.properties, null, 2));
        });
      } else {
        console.log('No Rjukan facilities found in first 5 features');
      }
    }

    // Nå søk spesifikt med større dataset
    console.log('\n\n=== SEARCHING IN LARGER DATASET (1000 features) ===');
    const url2 = 'https://gis.fiskeridir.no/server/services/FiskeridirWFS_akva/MapServer/WFSServer?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=FiskeridirWFS_akva:Flate_ihht_Akvakulturregisteret&OUTPUTFORMAT=GEOJSON&COUNT=1000';

    const response2 = await fetch(url2);
    let text2 = await response2.text();

    text2 = text2.replace(/"type":"MultiPolygon",}/g, '"type":"MultiPolygon","coordinates":[]}');
    text2 = text2.replace(/"type":"Polygon",}/g, '"type":"Polygon","coordinates":[]}');

    const data2 = JSON.parse(text2);

    const rjukan2 = data2.features.find(f => f.properties.loknr === 36977);

    if (rjukan2) {
      console.log('\nRJUKAN II FOUND (loknr 36977):');
      console.log(JSON.stringify(rjukan2.properties, null, 2));
    } else {
      console.log('\nRjukan II (loknr 36977) not found in first 1000 features');

      // List all features with "Rjukan" in name
      const allRjukan2 = data2.features.filter(f =>
        f.properties.loknam && f.properties.loknam.toLowerCase().includes('rjukan')
      );

      if (allRjukan2.length > 0) {
        console.log('\nBut found these Rjukan facilities:');
        allRjukan2.forEach(f => {
          console.log(`  ${f.properties.loknam} (loknr: ${f.properties.loknr})`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkPolygonFields();
