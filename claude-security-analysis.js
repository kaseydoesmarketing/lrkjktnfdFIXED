import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Read all key application files for analysis
async function readApplicationFiles() {
  const files = {};
  
  try {
    // Core application files
    files['schema.ts'] = await fs.readFile('./shared/schema.ts', 'utf-8');
    files['routes.ts'] = await fs.readFile('./server/routes.ts', 'utf-8');
    files['storage.ts'] = await fs.readFile('./server/storage.ts', 'utf-8');
    files['auth.ts'] = await fs.readFile('./server/auth.ts', 'utf-8');
    files['googleAuth.ts'] = await fs.readFile('./server/googleAuth.ts', 'utf-8');
    files['youtubeService.ts'] = await fs.readFile('./server/youtubeService.ts', 'utf-8');
    files['scheduler.ts'] = await fs.readFile('./server/scheduler.ts', 'utf-8');
    
    // Frontend files
    files['App.tsx'] = await fs.readFile('./client/src/App.tsx', 'utf-8');
    files['dashboard-futuristic.tsx'] = await fs.readFile('./client/src/pages/dashboard-futuristic.tsx', 'utf-8');
    files['login.tsx'] = await fs.readFile('./client/src/pages/login.tsx', 'utf-8');
    
    // Configuration files
    files['package.json'] = await fs.readFile('./package.json', 'utf-8');
    files['vite.config.ts'] = await fs.readFile('./vite.config.ts', 'utf-8');
    
    console.log('📁 Successfully loaded all application files for analysis');
    return files;
  } catch (error) {
    console.error('❌ Error reading files:', error);
    return {};
  }
}

async function analyzeWithClaude() {
  const files = await readApplicationFiles();
  
  const analysisPrompt = `As a senior security consultant and full-stack architect, conduct a comprehensive analysis of this TitleTesterPro YouTube A/B testing application.

ANALYZE THESE FILES:
${Object.entries(files).map(([filename, content]) => `
--- ${filename} ---
${content}
`).join('\n')}

PROVIDE DETAILED ANALYSIS IN THESE CATEGORIES:

## 1. CRITICAL SECURITY VULNERABILITIES
- Authentication/authorization flaws
- SQL injection risks
- XSS vulnerabilities  
- CSRF protection gaps
- Token/session security issues
- OAuth implementation problems
- Data exposure risks
- Input validation gaps

## 2. SYSTEM ARCHITECTURE IMPROVEMENTS
- Code organization and modularity
- Database design optimizations
- API design improvements
- Error handling enhancements
- Performance bottlenecks
- Scalability concerns
- Memory/resource management

## 3. FEATURE ENHANCEMENTS
- User experience improvements
- Missing functionality gaps
- Business logic optimizations
- Analytics and reporting enhancements
- Integration opportunities
- Automation improvements

## 4. CODE QUALITY ISSUES
- TypeScript type safety gaps
- Inconsistent patterns
- Code duplication
- Poor error handling
- Logging deficiencies
- Testing gaps
- Documentation needs

## 5. DEPLOYMENT & OPERATIONS
- Environment configuration issues
- Monitoring and observability gaps
- Backup and recovery concerns
- CI/CD improvements
- Secret management issues

For each issue, provide:
- Severity level (Critical/High/Medium/Low)
- Specific code location if applicable
- Detailed explanation of the problem
- Concrete implementation solution
- Business impact assessment

Focus on actionable recommendations with specific code examples where relevant.`;

  try {
    console.log('🤖 Starting comprehensive Claude analysis...');
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", // Latest Claude model
      max_tokens: 8000, // Increased for comprehensive analysis
      messages: [{
        role: "user",
        content: analysisPrompt
      }]
    });

    const analysis = response.content[0].text;
    
    // Save analysis to file
    await fs.writeFile('./CLAUDE_COMPREHENSIVE_ANALYSIS.md', analysis, 'utf-8');
    
    console.log('✅ Analysis complete! Results saved to CLAUDE_COMPREHENSIVE_ANALYSIS.md');
    console.log('\n📊 ANALYSIS PREVIEW:');
    console.log('='.repeat(80));
    console.log(analysis.substring(0, 2000) + '\n...\n[Full analysis in CLAUDE_COMPREHENSIVE_ANALYSIS.md]');
    console.log('='.repeat(80));
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Claude analysis failed:', error);
    throw error;
  }
}

// Run the analysis
analyzeWithClaude().catch(console.error);