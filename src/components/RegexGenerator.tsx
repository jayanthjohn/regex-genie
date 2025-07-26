import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Copy, CheckCircle2, Wand2, Code, TestTube, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RegexResult {
  pattern: string;
  jmeterFormat: string;
  groovyCode: string;
  matches: string[];
}

export const RegexGenerator = () => {
  const { toast } = useToast();
  const [sourceString, setSourceString] = useState('');
  const [targetString, setTargetString] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [result, setResult] = useState<RegexResult | null>(null);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [selectedView, setSelectedView] = useState<'regex' | 'jmeter' | 'groovy' | 'test'>('regex');

  const escapeRegex = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const generateRegex = () => {
    if (!sourceString || !targetString) {
      toast({
        title: "Missing Input",
        description: "Please provide both source string and target string",
        variant: "destructive",
      });
      return;
    }

    if (!sourceString.includes(targetString)) {
      toast({
        title: "Target Not Found",
        description: "Target string not found in source string",
        variant: "destructive",
      });
      return;
    }

    const index = sourceString.indexOf(targetString);
    const beforeTarget = sourceString.substring(0, index);
    const afterTarget = sourceString.substring(index + targetString.length);

    // Find meaningful boundary patterns
    const beforePattern = beforeTarget.length > 0 ? 
      escapeRegex(beforeTarget.slice(-Math.min(20, beforeTarget.length))) : '';
    const afterPattern = afterTarget.length > 0 ? 
      escapeRegex(afterTarget.slice(0, Math.min(20, afterTarget.length))) : '';

    // Generate different regex patterns based on context
    let pattern: string;
    if (beforePattern && afterPattern) {
      pattern = `${beforePattern}(.+?)${afterPattern}`;
    } else if (beforePattern) {
      pattern = `${beforePattern}(.+?)$`;
    } else if (afterPattern) {
      pattern = `^(.+?)${afterPattern}`;
    } else {
      pattern = `(${escapeRegex(targetString)})`;
    }

    // JMeter format
    const jmeterFormat = `<RegexExtractor guiclass="RegexExtractorGui" testclass="RegexExtractor" testname="Extract Value" enabled="true">
  <stringProp name="RegexExtractor.useHeaders">false</stringProp>
  <stringProp name="RegexExtractor.refname">extractedValue</stringProp>
  <stringProp name="RegexExtractor.regex">${pattern}</stringProp>
  <stringProp name="RegexExtractor.template">$1$</stringProp>
  <stringProp name="RegexExtractor.default">NOT_FOUND</stringProp>
  <stringProp name="RegexExtractor.match_number">1</stringProp>
</RegexExtractor>`;

    // Groovy code
    const groovyCode = `// Groovy script for regex extraction
import java.util.regex.Pattern
import java.util.regex.Matcher

// Define the regex pattern
String pattern = "${pattern.replace(/\\/g, '\\\\')}"
String input = """${sourceString.replace(/"/g, '\\"')}"""

// Create pattern and matcher
Pattern regexPattern = Pattern.compile(pattern)
Matcher matcher = regexPattern.matcher(input)

// Extract the value
if (matcher.find()) {
    String extractedValue = matcher.group(1)
    log.info("Extracted value: " + extractedValue)
    
    // Set as JMeter variable
    vars.put("extractedValue", extractedValue)
    
    // Custom processing based on prompt
    ${customPrompt ? `// Custom logic: ${customPrompt}
    // Add your custom processing here` : '// Add any custom processing logic here'}
} else {
    log.error("Pattern not matched")
    vars.put("extractedValue", "NOT_FOUND")
}`;

    // Test the pattern
    const regex = new RegExp(pattern, 'g');
    const matches = [];
    let match;
    while ((match = regex.exec(sourceString)) !== null) {
      matches.push(match[1] || match[0]);
    }

    setResult({
      pattern,
      jmeterFormat,
      groovyCode,
      matches
    });

    toast({
      title: "Regex Generated",
      description: `Pattern generated successfully with ${matches.length} match(es)`,
    });
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      toast({
        title: "Copied!",
        description: "Content copied to clipboard",
      });
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const CopyButton = ({ text, label, keyName }: { text: string; label: string; keyName: string }) => (
    <Button
      variant="copy"
      size="sm"
      onClick={() => copyToClipboard(text, keyName)}
      className="ml-2"
    >
      {copiedStates[keyName] ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      <span className="ml-1">{copiedStates[keyName] ? 'Copied' : label}</span>
    </Button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Regex Pattern Generator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Generate regex patterns for JMeter Regular Expression Extractor and Groovy scripts
          </p>
        </div>

        {/* Input Section */}
        <Card className="bg-gradient-card shadow-elegant border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Input Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source">Source String</Label>
                <Textarea
                  id="source"
                  placeholder="Paste your source string here..."
                  value={sourceString}
                  onChange={(e) => setSourceString(e.target.value)}
                  className="font-mono text-sm min-h-32 resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target">Target String to Extract</Label>
                <Input
                  id="target"
                  placeholder="Enter the string you want to extract"
                  value={targetString}
                  onChange={(e) => setTargetString(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">Custom Groovy Logic (Optional)</Label>
              <Input
                id="prompt"
                placeholder="e.g., Convert to uppercase, validate format, etc."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            </div>
            <Button 
              onClick={generateRegex} 
              className="w-full"
              disabled={!sourceString || !targetString}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Regex Pattern
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <Card className="bg-gradient-card shadow-elegant border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5 text-primary" />
                Generated Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-48">
                      {selectedView === 'regex' && 'Regex Pattern'}
                      {selectedView === 'jmeter' && 'JMeter Config'}
                      {selectedView === 'groovy' && 'Groovy Script'}
                      {selectedView === 'test' && 'Test Results'}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSelectedView('regex')}>
                      Regex Pattern
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedView('jmeter')}>
                      JMeter Config
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedView('groovy')}>
                      Groovy Script
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedView('test')}>
                      Test Results
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedView === 'regex' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Generated Regex Pattern</Label>
                      <CopyButton text={result.pattern} label="Copy" keyName="pattern" />
                    </div>
                    <div className="bg-code-bg border border-code-border rounded-md p-4">
                      <code className="text-sm font-mono text-foreground break-all">
                        {result.pattern}
                      </code>
                    </div>
                  </div>
                )}

                {selectedView === 'jmeter' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>JMeter Regular Expression Extractor XML</Label>
                      <CopyButton text={result.jmeterFormat} label="Copy XML" keyName="jmeter" />
                    </div>
                    <div className="bg-code-bg border border-code-border rounded-md p-4 overflow-x-auto">
                      <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
                        {result.jmeterFormat}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedView === 'groovy' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Groovy Script</Label>
                      <CopyButton text={result.groovyCode} label="Copy Script" keyName="groovy" />
                    </div>
                    <div className="bg-code-bg border border-code-border rounded-md p-4 overflow-x-auto">
                      <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
                        {result.groovyCode}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedView === 'test' && (
                  <div className="space-y-2">
                    <Label>Pattern Test Results</Label>
                    <div className="bg-code-bg border border-code-border rounded-md p-4">
                      {result.matches.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm text-primary">
                            ✓ Found {result.matches.length} match(es):
                          </p>
                          {result.matches.map((match, index) => (
                            <div key={index} className="bg-secondary/20 rounded p-2">
                              <code className="text-sm font-mono text-foreground">
                                Match {index + 1}: "{match}"
                              </code>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-destructive">✗ No matches found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage Guide */}
        <Card className="bg-gradient-card shadow-elegant border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              Usage Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-primary">JMeter Setup</h3>
                <p className="text-sm text-muted-foreground">
                  1. Add Regular Expression Extractor to your sampler<br/>
                  2. Paste the generated XML configuration<br/>
                  3. Use ${`{extractedValue}`} in subsequent requests
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-primary">Groovy Processing</h3>
                <p className="text-sm text-muted-foreground">
                  1. Add JSR223 PostProcessor<br/>
                  2. Set Language to Groovy<br/>
                  3. Paste the generated script<br/>
                  4. Customize logic as needed
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-primary">Pattern Testing</h3>
                <p className="text-sm text-muted-foreground">
                  1. Test your pattern in the Test Results tab<br/>
                  2. Verify matches are correct<br/>
                  3. Adjust source/target if needed<br/>
                  4. Re-generate for optimization
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};