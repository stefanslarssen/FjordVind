const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'api-response.json'), 'utf-8'));

console.log('\n=== API RESPONSE ANALYSIS ===\n');
console.log('Total features:', data.features.length);

// Check for Rjukan
const rjukan = data.features.filter(f =>
  f.properties.name && f.properties.name.toLowerCase().includes('rjukan')
);

console.log('\n=== RJUKAN CHECK ===');
if (rjukan.length > 0) {
  console.log('❌ Rjukan facilities FOUND:');
  rjukan.forEach(f => {
    console.log(`   ${f.properties.name} (loknr: ${f.properties.loknr})`);
  });
} else {
  console.log('✅ NO Rjukan facilities - correctly filtered out!');
}

// Check geometry types
console.log('\n=== GEOMETRY CHECK ===');
const samples = data.features.slice(0, 10);
samples.forEach(f => {
  let pointCount;
  if (f.geometry.type === 'MultiPolygon') {
    pointCount = f.geometry.coordinates[0][0].length;
  } else {
    pointCount = f.geometry.coordinates[0].length;
  }
  console.log(`${f.properties.name}: ${f.geometry.type} (${pointCount} points)`);
});

// Check if any are hexagons (7 points)
const hexagons = data.features.filter(f => {
  let pointCount;
  if (f.geometry.type === 'MultiPolygon') {
    pointCount = f.geometry.coordinates[0][0].length;
  } else {
    pointCount = f.geometry.coordinates[0].length;
  }
  return pointCount === 7;
});

console.log(`\n${hexagons.length} features with 7 points (potential generated hexagons)`);
console.log(`${data.features.length - hexagons.length} features with real polygon shapes`);

if (hexagons.length === data.features.length) {
  console.log('\n❌ ALL features are hexagons - using fallback generated polygons');
} else if (hexagons.length === 0) {
  console.log('\n✅ ALL features are real polygons from Fiskeridirektoratet REST API');
} else {
  console.log('\n⚠️ Mixed: some real polygons, some generated hexagons');
}
