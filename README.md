# AQUI

A React Native mobile application for air quality monitoring using SDS011/SDS021 PM sensors. AQUI connects to particulate matter sensors via USB to provide real-time air quality measurements.

## Features

- Connect to SDS011/SDS021 particulate matter sensors via USB
- Real-time monitoring of PM2.5 and PM10 air quality data
- Running averages of air quality measurements
- Device discovery and connection management
- Logs with user-friendly and developer modes
- Cross-platform support for Android and iOS

## Development

### Prerequisites

- Node.js (v18 or higher)
- React Native CLI
- Android Studio or Xcode (depending on target platform)
- SDS011 or SDS021 PM sensor (for testing)

### Getting Started

1. Install dependencies:
   ```sh
   npm install
   ```

2. Start the Metro server:
   ```sh
   npm start
   ```

3. Run the app:
   ```sh
   # For Android
   npm run android
   
   # For iOS
   npm run ios
   ```

## Building Release Versions

### Environment Setup

1. Make sure you have a keystore file in `android/app/my-release-key.keystore`
   - If you need to generate a keystore, run:
     ```sh
     keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
     ```
   - Then move the generated file to `android/app/`

2. Create a `.env` file in the project root with your keystore passwords:
   ```
   ANDROID_STORE_PASSWORD=your-store-password
   ANDROID_KEY_PASSWORD=your-key-password
   ```

### Android Release Build

Run the following command to build a signed APK:
```sh
npm run build-android-release
```

The generated APK will be located at `android/app/build/outputs/apk/release/app-release.apk`

### iOS Release Build

To build for iOS in release configuration:
```sh
npm run build-ios-release
```

### Combined Build

To build for both platforms:
```sh
npm run build-release
```

## Automated Builds with GitHub Actions

This project includes a GitHub Actions workflow that automatically builds and publishes Android APKs when a new version tag is pushed.

### Setup

1. Add the following secrets to your GitHub repository:
   - `KEYSTORE_BASE64`: Your base64-encoded keystore file
   - `ANDROID_STORE_PASSWORD`: The password for your keystore
   - `ANDROID_KEY_PASSWORD`: The password for your key alias

2. Convert your keystore to base64:
   ```sh
   # On Linux/macOS
   base64 -i my-release-key.keystore

   # On Windows PowerShell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("my-release-key.keystore"))
   ```

3. Push a version tag to trigger a build:
   ```sh
   git tag v1.0.0
   git push origin v1.0.0
   ```

The workflow will:
1. Build the APK with release signing
2. Create a GitHub release for the tag
3. Attach the APK to the release
