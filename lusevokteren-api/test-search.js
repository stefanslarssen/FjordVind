async function testSearch() {
  try {
    console.log('Testing search endpoint...');
    const response = await fetch('http://localhost:3000/api/barentswatch/search?q=Andal');
    console.log('Status:', response.status);
    const data = await response.text();
    console.log('Response:', data.slice(0, 500));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSearch();
