import {FilePickerOptions} from "./simple-filepicker.common";

export class FilePicker {
    openFilePicker = (params?: FilePickerOptions): Promise<{ files: string[]; uris?: string[]; fileDatas?: any[]; }> => {}
}