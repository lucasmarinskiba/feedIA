# Computer Vision + Analysis Layer - Visual Intelligence

**Screen analysis: understand what's on screen, extract actionable data.**

---

## VISION CAPABILITIES

### 1. Screenshot Analysis
```
Input: Screenshot from user's screen
Process:
├── OCR: extract all text
├── Element detection: buttons, inputs, images, videos
├── Layout understanding: where things are positioned
├── Color analysis: brand colors, design patterns
└── Context detection: which platform (Instagram/TikTok/etc)
Output: Structured data about screen state
```

### 2. Content Analysis
```
Input: Image/video on screen
Process:
├── Object detection: what's in the image
├── Text detection: any text overlays/captions
├── Engagement signals: likes, comments, shares visible
├── Quality assessment: resolution, composition, focus
├── Emotion detection: what viewer likely feels
└── Viral potential: prediction score
Output: Content analysis + recommendations
```

### 3. Account Analysis
```
Input: User's Instagram/TikTok profile visible on screen
Process:
├── Bio parsing: extract niche, positioning
├── Follower count: track growth
├── Post frequency: analyze cadence
├── Engagement rate: calculate true metric
├── Best performing content: identify patterns
├── Audience demographics: estimate from visible comments
└── Growth trajectory: trend analysis
Output: Account health report + optimization suggestions
```

### 4. Competitor Analysis
```
Input: Competitor profile on screen
Process:
├── Positioning analysis: how they message
├── Content strategy: what they post (pillar %)
├── Engagement patterns: which content performs
├── Growth rate: estimated monthly gain
├── Audience overlap: estimate shared followers
└── Differentiation gaps: where we can win
Output: Competitive advantage map
```

### 5. Comment/Message Analysis
```
Input: Messages/comments visible on screen
Process:
├── Sentiment: positive/negative/neutral
├── Intent: spam, question, feedback, complaint
├── Urgency: immediate response needed?
├── Solution required: what does user want?
├── Sales opportunity: buying signal?
└── Conversation context: thread understanding
Output: Response recommendation + draft reply
```

---

## IMPLEMENTATION

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface VisionAnalysis {
  screenState: string;
  elements: any[];
  content: any;
  recommendations: string[];
  nextAction: string;
}

async function analyzeScreenshot(): Promise<VisionAnalysis> {
  // Step 1: Capture screenshot
  const screenshot = await captureScreenshot();

  // Step 2: Send to Claude Vision
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-1",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: screenshot,
            },
          },
          {
            type: "text",
            text: `Analyze this screenshot. Extract:
1. Current screen/platform (Instagram/TikTok/etc)
2. All visible elements (buttons, inputs, text, images)
3. Content visible (posts, comments, messages, etc)
4. Current user action context
5. Next recommended action for FeedIA automation
6. Any engagement/quality metrics visible

Format as structured JSON.`,
          },
        ],
      },
    ],
  });

  const analysis = JSON.parse(
    response.content[0].type === "text" ? response.content[0].text : "{}",
  );

  return {
    screenState: analysis.platform,
    elements: analysis.elements,
    content: analysis.content,
    recommendations: analysis.recommendations,
    nextAction: analysis.nextAction,
  };
}

async function captureScreenshot(): Promise<string> {
  // Windows: Use PrintScreen
  // Mac: Use screencapture
  // Linux: Use import
  const platform = process.platform;
  let command = "";

  if (platform === "win32") {
    command = "powershell -Command \"[Windows.Forms.Screen]::PrimaryScreen | Out-Null\"";
  } else if (platform === "darwin") {
    command = "screencapture -x /tmp/screenshot.png";
  } else {
    command = "import -window root /tmp/screenshot.png";
  }

  await execAsync(command);

  // Read and encode screenshot
  const fs = require("fs");
  const buffer = fs.readFileSync("/tmp/screenshot.png");
  return buffer.toString("base64");
}
```

---

## USAGE IN BROWSER AUTOMATION

```typescript
async function automateInstagramPost(postBrief: any) {
  // Step 1: Analyze current screen state
  const vision = await analyzeScreenshot();

  if (vision.screenState !== "instagram") {
    // Navigate to Instagram
    await navigateToInstagram();
    // Re-analyze
    const updatedVision = await analyzeScreenshot();
  }

  // Step 2: FeedIA generates content (using vision data)
  const content = await feediaBrain.generateCarousel({
    ...postBrief,
    accountAnalysis: vision.content.accountAnalysis,
    audienceInsights: vision.content.audienceInsights,
  });

  // Step 3: Extract upload button location from vision
  const uploadButton = vision.elements.find(
    (el: any) => el.type === "button" && el.label.includes("Create"),
  );

  // Step 4: Click upload button
  await clickElement(uploadButton.position);

  // Step 5: Re-analyze screen (now in upload flow)
  const uploadScreenVision = await analyzeScreenshot();

  // Step 6: Fill form based on vision analysis
  await fillUploadForm(content, uploadScreenVision);
}
```

---

## BENEFITS

- **Real-time context**: Always knows what's on screen
- **Autonomous decisions**: Vision → decision making → action
- **Error recovery**: Can see errors, correct automatically
- **Quality control**: Can verify output visually before submission
- **Learning**: Continuously improves through visual feedback

Computer Vision = FeedIA's eyes + brain combination.
