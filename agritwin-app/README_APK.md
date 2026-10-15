# Create an apk for Android

1. npm install -g eas-cli
2. eas login
3. eas build:configure
4. eas build -p android --profile preview


5. eas env:set --name EXPO_PUBLIC_API_URL --value "endpoint" --environment preview --visibility plaintext #  Afegir .env: 
6.  eas env:list --environment preview
