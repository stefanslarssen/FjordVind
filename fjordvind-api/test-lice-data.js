async function testLiceData() {
  const response = await fetch('http://localhost:3000/api/locality-boundaries');
  const data = await response.json();

  console.log('Total features:', data.features.length);

  const withLice = data.features.filter(f => f.properties.avgAdultFemaleLice !== null);
  console.log('Features with lice data:', withLice.length);

  if (withLice.length > 0) {
    console.log('\nSample features with lice data:');
    withLice.slice(0, 10).forEach(f =>
      console.log('-', f.properties.name, '| loknr:', f.properties.loknr, '| lus:', f.properties.avgAdultFemaleLice, '| status:', f.properties.status)
    );
  } else {
    console.log('\nNo features have lice data. Checking a sample:');
    data.features.slice(0, 5).forEach(f =>
      console.log('-', f.properties.name, '| loknr:', f.properties.loknr, '| all props:', JSON.stringify(f.properties))
    );
  }

  // Check status distribution
  const statusCounts = {};
  data.features.forEach(f => {
    const status = f.properties.status || 'null';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  console.log('\nStatus distribution:', statusCounts);
}

testLiceData();
