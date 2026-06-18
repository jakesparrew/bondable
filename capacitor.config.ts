import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bondable.crm',
  appName: 'Bondable',
  webDir: 'dist',
  /*
  server: {
    url: 'https://app.bondable.co',
    cleartext: true
  },
  */
  plugins: {
    SplashScreen: {
      launchAutoHide: true, 
      backgroundColor: '#232323',
      showSpinner: false
    }
  }
};

export default config;

/*
npm install
npx cap add ios/android
npm run build
npx cap sync
npx cap run ios

npx @capacitor/assets generate
npx cap open ios
*/