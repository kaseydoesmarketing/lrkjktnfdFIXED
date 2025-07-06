# Node.js Installation Guide for TitleTesterPro

## 🚨 **CRITICAL: You need Node.js and npm to run TitleTesterPro**

Your system currently doesn't have Node.js installed, which is required to run the application.

---

## 🍎 **Installation Methods for macOS**

### **Method 1: Homebrew (Recommended)**

1. **Install Homebrew** (if you don't have it):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Node.js**:
   ```bash
   brew install node
   ```

3. **Verify installation**:
   ```bash
   node --version
   npm --version
   ```

### **Method 2: Official Installer**

1. **Download Node.js**:
   - Go to [nodejs.org](https://nodejs.org)
   - Download the LTS version (recommended)
   - Run the installer package

2. **Verify installation**:
   ```bash
   node --version
   npm --version
   ```

### **Method 3: Using nvm (Node Version Manager)**

1. **Install nvm**:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   ```

2. **Restart terminal or run**:
   ```bash
   source ~/.zshrc
   ```

3. **Install Node.js**:
   ```bash
   nvm install --lts
   nvm use --lts
   ```

4. **Verify installation**:
   ```bash
   node --version
   npm --version
   ```

---

## ✅ **After Installation - Setup TitleTesterPro**

Once Node.js is installed, run these commands:

### **1. Verify Installation**
```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show 9.x.x or higher
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Set Up Environment**
```bash
cp env.template .env
# Edit .env with your API keys
```

### **4. Run Database Migration**
```bash
npm run db:push
```

### **5. Start the Application**
```bash
npm run dev
```

### **6. Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## 🔧 **Required Node.js Version**

**Minimum**: Node.js 18.x  
**Recommended**: Node.js 20.x LTS

---

## 🐛 **Troubleshooting**

### **If Homebrew fails:**
```bash
# Update Homebrew
brew update

# Try again
brew install node
```

### **If you get permission errors:**
```bash
# Fix permissions
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### **If npm is slow:**
```bash
# Use a faster registry
npm config set registry https://registry.npmjs.org/
```

---

## 📋 **What Node.js Provides**

Node.js is required for:
- ✅ **Running the Express.js server**
- ✅ **Installing npm packages**
- ✅ **Building the React frontend**
- ✅ **Running TypeScript compilation**
- ✅ **Database migrations**
- ✅ **Development server**

---

## 🎯 **Quick Start After Installation**

```bash
# 1. Navigate to your project
cd /Users/kvimedia/lrkjktnfdFIXED

# 2. Install dependencies
npm install

# 3. Set up environment
cp env.template .env

# 4. Run database migration
npm run db:push

# 5. Start development server
npm run dev
```

---

## 📞 **Need Help?**

If you encounter issues:
1. Check Node.js version: `node --version`
2. Check npm version: `npm --version`
3. Try clearing npm cache: `npm cache clean --force`
4. Reinstall dependencies: `rm -rf node_modules && npm install`

---

## 🎉 **Success Indicators**

You'll know everything is working when:
- ✅ `node --version` shows a version number
- ✅ `npm --version` shows a version number
- ✅ `npm install` completes without errors
- ✅ `npm run dev` starts the development server
- ✅ You can access http://localhost:5000 in your browser

**Once Node.js is installed, your TitleTesterPro application will be fully functional! 🚀** 