import * as app from 'tns-core-modules/application';
import * as permissions from 'nativescript-perms';
import {FilePickerOptions} from "./simple-filepicker.common";

function callIntent(context, intent, pickerType) {
    return permissions.request('storage').then(function () {
        return new Promise(function (resolve, reject) {
            const onEvent = function (e) {
                console.log('startActivityForResult ', e.requestCode);
                if (e.requestCode === pickerType) {
                    resolve(e);
                    app.android.off(app.AndroidApplication.activityResultEvent, onEvent);
                }
            };
            app.android.once(app.AndroidApplication.activityResultEvent, onEvent);
            context.startActivityForResult(intent, pickerType);
        });
    });
}

function setMimeTypeOnIntent(intent: any, allowedTypes: string[]): void {
    if (allowedTypes.length === 0) {
        return;
    }

    const extensions = Array.create(java.lang.String, allowedTypes.length);
    for (let i = 0; i < allowedTypes.length; i++) {
        extensions[i] = allowedTypes[i];
    }
    if (extensions.length > 1) {
        intent.setType("*/*");
        intent.putExtra(android.content.Intent.EXTRA_MIME_TYPES, extensions);
    }
    else {
        intent.setType(extensions[0]);
    }
}

class UriHelper {
    public static _calculateFileUri(uri: android.net.Uri) {
        let DocumentsContract = (<any>android.provider).DocumentsContract;
        let isKitKat = android.os.Build.VERSION.SDK_INT >= 19; // android.os.Build.VERSION_CODES.KITKAT

        if (isKitKat && DocumentsContract.isDocumentUri(app.android.context, uri)) {
            let docId, id, type;
            let contentUri: android.net.Uri = null;

            // ExternalStorageProvider
            if (UriHelper.isExternalStorageDocument(uri)) {
                docId = DocumentsContract.getDocumentId(uri);
                id = docId.split(":")[1];
                type = docId.split(":")[0];

                if ("primary" === type.toLowerCase()) {
                    return android.os.Environment.getExternalStorageDirectory() + "/" + id;
                } else {
                    if (android.os.Build.VERSION.SDK_INT > 23) {
                        (this.getContentResolver() as any).takePersistableUriPermission(
                            uri,
                            android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION | android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION,
                        );
                        const externalMediaDirs = app.android.context.getExternalMediaDirs();
                        if (externalMediaDirs.length > 1) {
                            let filePath = externalMediaDirs[1].getAbsolutePath();
                            filePath = filePath.substring(0, filePath.indexOf("Android")) + id;
                            return filePath;
                        }
                    }
                }
            }
            // DownloadsProvider
            else if (UriHelper.isDownloadsDocument(uri)) {
                return UriHelper.getDataColumn(uri, null, null, true, false);
            }
            // MediaProvider
            else if (UriHelper.isMediaDocument(uri)) {
                docId = DocumentsContract.getDocumentId(uri);
                let split = docId.split(":");
                type = split[0];
                id = split[1];

                if ("image" === type) {
                    contentUri = android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
                } else if ("video" === type) {
                    contentUri = android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
                } else if ("audio" === type) {
                    contentUri = android.provider.MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
                } else if ("document" === type) {
                    contentUri = android.provider.MediaStore.Files.getContentUri('external');
                }

                let selection = "_id=?";
                let selectionArgs = [id];

                return UriHelper.getDataColumn(contentUri, selection, selectionArgs, false, type === "document");
            }
        }
        else {
            // MediaStore (and general)
            if ("content" === uri.getScheme()) {
                return UriHelper.getDataColumn(uri, null, null, false, false);
            }
            // FILE
            else if ("file" === uri.getScheme()) {
                return uri.getPath();
            }
        }

        return undefined;
    }

    private static getDataColumn(uri: android.net.Uri, selection, selectionArgs, isDownload: boolean, isFile: boolean) {
        let cursor = null;
        let filePath;
        if (isDownload) {
            let columns = ["_display_name"];
            try {
                cursor = this.getContentResolver().query(uri, columns, selection, selectionArgs, null);
                if (cursor != null && cursor.moveToFirst()) {
                    let column_index = cursor.getColumnIndexOrThrow(columns[0]);
                    filePath = cursor.getString(column_index);
                    if (filePath) {
                        const dl = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS);
                        filePath = `${dl}/${filePath}`;
                        return filePath;
                    }
                }
            }
            catch (e) {
                console.log(e);
            }
            finally {
                if (cursor) {
                    cursor.close();
                }
            }
        } else if(isFile) {
            let columns = [android.provider.MediaStore.Files.FileColumns.DATA];
            let filePath;

            try {
                cursor = this.getContentResolver().query(uri, columns, selection, selectionArgs, null);
                if (cursor != null && cursor.moveToFirst()) {
                    let column_index = cursor.getColumnIndexOrThrow(columns[0]);
                    filePath = cursor.getString(column_index);
                    if (filePath) {
                        return filePath;
                    }
                }
            }
            catch (e) {
                console.log(e);
            }
            finally {
                if (cursor) {
                    cursor.close();
                }
            }
        } else {
            let columns = [android.provider.MediaStore.MediaColumns.DATA];
            let filePath;

            try {
                cursor = this.getContentResolver().query(uri, columns, selection, selectionArgs, null);
                if (cursor != null && cursor.moveToFirst()) {
                    let column_index = cursor.getColumnIndexOrThrow(columns[0]);
                    filePath = cursor.getString(column_index);
                    if (filePath) {
                        return filePath;
                    }
                }
            }
            catch (e) {
                console.log(e);
            }
            finally {
                if (cursor) {
                    cursor.close();
                }
            }
        }
        return undefined;

    }

    private static isExternalStorageDocument(uri: android.net.Uri) {
        return "com.android.externalstorage.documents" === uri.getAuthority();
    }

    private static isDownloadsDocument(uri: android.net.Uri) {
        return "com.android.providers.downloads.documents" === uri.getAuthority();
    }

    private static isMediaDocument(uri: android.net.Uri) {
        return "com.android.providers.media.documents" === uri.getAuthority();
    }

    private static getContentResolver(): android.content.ContentResolver {
        return app.android.nativeApp.getContentResolver();
    }
}

export class FilePicker {
    openFilePicker = (params?: FilePickerOptions) => {
        const context = app.android.foregroundActivity || app.android.startActivity;
        const FILE_CODE = 1231;
        const intent = new android.content.Intent(android.content.Intent.ACTION_GET_CONTENT);
    
        intent.addCategory(android.content.Intent.CATEGORY_OPENABLE);
        intent.setAction(android.content.Intent.ACTION_OPEN_DOCUMENT);
        intent.putExtra(android.content.Intent.EXTRA_ALLOW_MULTIPLE, params && !!params.multipleSelection || false);
        // intent.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
    
        const allowedTypes = params ? params.extensions : [];
        setMimeTypeOnIntent(intent, allowedTypes);
        return callIntent(context, intent, FILE_CODE).then((result: any) => {
            if (result.resultCode === android.app.Activity.RESULT_OK) {
                if (result.intent != null) {
                    const uri = result.intent.getData();
                    let uris = [uri];
                    if (!uri) {
                        uris  = [];
                        const clipData = result.intent.getClipData();
                        if (clipData) {
                            // multiple selection
                            for (let i = 0; i < clipData.getItemCount(); i++) {
                                const clipDataItem = clipData.getItemAt(i);
                                const fileUri = clipDataItem.getUri();
                                uris.push(fileUri);
                            }
                        }
                    }
                    const paths = uris.map(uri => {
                        let customUri: any = UriHelper._calculateFileUri(uri);
                        if (customUri && customUri !== '') {
                            return customUri;
                        } else {
                            return com.nativescript.simple.FilePicker.getPath(context, uri);
                        }
                    });
                    return {
                        files: paths
                    };
                }
                return {
                    files: []
                };
            }
            else {
                throw new Error('no_file');
            }
        });
    }
}

