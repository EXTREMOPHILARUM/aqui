const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

// Determine which command to use based on platform
const isWindows = os.platform() === 'win32';
const gradleCommand = isWindows ? '.\\gradlew' : './gradlew';

try {
  console.log('Building Android release APK...');
  
  // Navigate to android directory
  process.chdir(path.join(__dirname, '..', 'android'));
  
  // Run the build command
  execSync(`${gradleCommand} assembleRelease`, { stdio: 'inherit' });
  
  console.log('Android release build completed successfully');
  
  // Navigate back to project root
  process.chdir(path.join(__dirname, '..'));
} catch (error) {
  console.error('Error building Android release:', error.message);
  process.exit(1);
} 