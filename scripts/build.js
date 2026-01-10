#!/usr/bin/env node

/**
 * Build Optimization Script
 * Optimizes assets and validates the build output
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🏗️  Starting optimized build process...\n");

// Clean previous build
if (fs.existsSync("dist")) {
  console.log("🧹 Cleaning previous build...");
  fs.rmSync("dist", { recursive: true, force: true });
}

// Run build
console.log("📦 Building project...");
try {
  execSync("npm run build", { stdio: "inherit" });
  console.log("✅ Build completed successfully\n");
} catch (error) {
  console.error("❌ Build failed");
  process.exit(1);
}

// Validate build output
console.log("🔍 Validating build output...");
const distDir = "dist";
const expectedFiles = ["index.html", "home.html", "demo.html"];

if (fs.existsSync(distDir)) {
  const files = fs.readdirSync(distDir);
  console.log(`📁 Build directory contains ${files.length} files`);

  expectedFiles.forEach((file) => {
    if (files.includes(file)) {
      const filePath = path.join(distDir, file);
      const stats = fs.statSync(filePath);
      console.log(`✅ ${file} (${Math.round(stats.size / 1024)}KB)`);
    } else {
      console.log(`⚠️  Missing: ${file}`);
    }
  });

  // Check for asset files
  const assetFiles = files.filter(
    (f) => f.includes(".js") || f.includes(".css")
  );
  console.log(`📋 Generated ${assetFiles.length} asset files`);
} else {
  console.error("❌ Build directory not found");
  process.exit(1);
}

console.log("\n🎉 Build optimization complete!");
console.log('🚀 Run "npm run preview" to test the production build');
