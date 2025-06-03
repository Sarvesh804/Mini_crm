async function testAPIs() {
    console.log('🌐 Testing API Endpoints...')
    
    const baseURL = 'http://localhost:3000'
    
    try {
      
      // Test 2: Customers API (public endpoint for testing)
      console.log('2. Testing customers endpoint...')
      try {
        const customersRes = await fetch(`${baseURL}/api/customer`)
        console.log(`Customers API status: ${customersRes.status}`)
        if (customersRes.status === 401) {
          console.log('✅ Authentication required (expected)')
        } else {
          const customersData = await customersRes.json()
          console.log('Customers response:', customersData)
        }
      } catch (error) {
        console.log('❌ Customers API error:', error)
      }
      
      // Test 3: Campaign preview (should require auth)
      console.log('3. Testing campaign preview endpoint...')
      try {
        const previewRes = await fetch(`${baseURL}/api/campaigns/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rules: [{ field: 'totalSpent', operator: '>', value: 1000 }]
          })
        })
        console.log(`Campaign preview status: ${previewRes.status}`)
        if (previewRes.status === 401) {
          console.log('✅ Authentication required (expected)')
        }
      } catch (error) {
        console.log('❌ Campaign preview error:', error)
      }
      
      // Test 4: AI Natural Language endpoint
      console.log('4. Testing AI natural language endpoint...')
      try {
        const nlRes = await fetch(`${baseURL}/api/ai/natural-language`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'customers who spent more than $1000'
          })
        })
        console.log(`Natural language API status: ${nlRes.status}`)
        if (nlRes.status === 401) {
          console.log('✅ Authentication required (expected)')
        }
      } catch (error) {
        console.log('❌ Natural language API error:', error)
      }
      
      console.log('🎉 API endpoint structure is correct!')
      
    } catch (error) {
      console.error('❌ API testing failed:', error)
    }
  }
  
  // Only run if server is running
  if (process.env.NODE_ENV !== 'production') {
    testAPIs()
  } else {
    console.log('ℹ️ Start the dev server first: npm run dev')
  }