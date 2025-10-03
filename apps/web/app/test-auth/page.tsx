'use client'

import { useUser } from '@clerk/nextjs'

export default function TestAuthPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  
  if (!isLoaded) {
    return <div style={{ padding: 20 }}>Loading...</div>
  }
  
  return (
    <div style={{ padding: 20, fontFamily: 'system-ui' }}>
      <h1>Authentication Test Page</h1>
      
      <h2>Clerk Status:</h2>
      <ul>
        <li>Loaded: {isLoaded ? 'Yes' : 'No'}</li>
        <li>Signed In: {isSignedIn ? 'Yes' : 'No'}</li>
      </ul>
      
      {isSignedIn && user && (
        <>
          <h2>User Details:</h2>
          <ul>
            <li>ID: {user.id}</li>
            <li>Email: {user.emailAddresses[0]?.emailAddress}</li>
            <li>Name: {user.firstName} {user.lastName}</li>
            <li>Created: {new Date(user.createdAt).toLocaleString()}</li>
          </ul>
        </>
      )}
      
      {!isSignedIn && (
        <p>
          You are not signed in. 
          <a href="/sign-in" style={{ marginLeft: 10, color: 'blue' }}>Sign In</a>
        </p>
      )}
    </div>
  )
}
