# Voice-to-Text as easy as it goes

![](https://img.shields.io/npm/v/@voiceout/core/latest)
![](https://github.com/voiceout-io/core/workflows/Release/badge.svg)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

Created from developers for developers ❤️

With [voiceout](https://voiceout.io/) you can integrate Voice-to-Text directly in your products.

## Get started within 2 minutes

### Step 1: Create account

Visit [console.voiceout.io](https://console.voiceout.io/) and create an account for free to get an API Key.

### Step 2: Install SDK

```bash
npm install --save @voiceout/core
```

### Step 3: Use SDK

#### Vanilla JS

```js
import { transcribe } from '@voiceout/core';

const { start, stop } = transcribe({
    apiToken: 'API_TOKEN_HERE',
    onStarted: () => {
        console.log('onStarted');
    },
    onStopped: (text) => {
        console.log('onStopped', text);
    },
    onChange: (text) => {
        console.log('onChange', text);
    },
    onError: (error) => {
        console.log('onError', error);
    }
});
```

#### [React.js](https://github.com/voiceout-io/react) (coming soon)

This SDK is still under development. Feel free to contribute.

#### [Vue.js](https://github.com/voiceout-io/vue) (coming soon)

This SDK is still under development. Feel free to contribute.

## Contribution

Every single contribution is highly appreciated. Just fork this repository, make your changes and create a PR.
