# NativeScript Simple FilePicker Plugin

A simple plugin for providing file picker functionality to your NativeScript app.

## Installation

```
tns plugin add whocode-nativescript-filepicker
```

## Usage 

``` TypeScript
import { FilePicker } from 'nativescript-simple-filepicker';

const myPicker = new FilePicker();

myPicker.openFilePicker({
    extensions?: string[]; // Defaults to all
    multipleSelection?: boolean; // Defaults to false
}).then((data) => {
    console.log(data.files);
});

```

## License

MIT
