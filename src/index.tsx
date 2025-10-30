import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from 'react-oidc-context';

// Use env vars if available (REACT_APP_...) otherwise fall back to existing values.
// For deployment to S3/CloudFront set REACT_APP_OIDC_AUTHORITY and REACT_APP_OIDC_CLIENT_ID in your build environment.
const cognitoAuthConfig = {
  authority: process.env.REACT_APP_OIDC_AUTHORITY || 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_SPlAn606f',
  client_id: process.env.REACT_APP_OIDC_CLIENT_ID || 'lmk8qk12er8t8ql9phit3u12e',
  // redirect to the current origin so it works both locally and when deployed to S3/CloudFront
  redirect_uri: window.location.origin,
  response_type: 'code',
  scope: 'openid profile email',
  post_logout_redirect_uri: window.location.origin,
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);