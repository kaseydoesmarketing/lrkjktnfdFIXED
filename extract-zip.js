const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const zipPath = './attached_assets/TitleTesterPro_Final_1751901240576.zip';
const extractPath = './extracted_final';

// Create extraction directory
if (!fs.existsSync(extractPath)) {
  fs.mkdirSync(extractPath, { recursive: true });
}

try {
  // Try to use system unzip if available
  console.log('Extracting zip file...');
  execSync(`cd ${extractPath} && jar xf ../${zipPath}`, { stdio: 'inherit' });
  console.log('Extraction complete!');
} catch (error) {
  console.error('Failed to extract with jar, trying alternative method...');
  
  // If that fails, list the contents at least
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    
    console.log('\nFiles in archive:');
    console.log('-'.repeat(60));
    
    entries.forEach((entry, index) => {
      if (index < 50) { // Show first 50 files
        console.log(`${entry.entryName} (${entry.header.size} bytes)`);
      }
    });
    
    if (entries.length > 50) {
      console.log(`... and ${entries.length - 50} more files`);
    }
    
    // Extract files
    console.log('\nExtracting files...');
    zip.extractAllTo(extractPath, true);
    console.log('Extraction complete!');
    
  } catch (admZipError) {
    console.error('AdmZip not available, listing basic info...');
    
    // Just show basic file info
    const stats = fs.statSync(zipPath);
    console.log(`Zip file size: ${stats.size} bytes`);
    console.log('Unable to extract without proper zip tools.');
  }
}

// List extracted contents
if (fs.existsSync(extractPath)) {
  console.log('\nExtracted contents:');
  console.log('-'.repeat(60));
  
  function listDir(dir, prefix = '') {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        console.log(`${prefix}📁 ${item}/`);
        if (prefix.length < 8) { // Limit depth
          listDir(fullPath, prefix + '  ');
        }
      } else {
        console.log(`${prefix}📄 ${item} (${stats.size} bytes)`);
      }
    });
  }
  
  listDir(extractPath);
}