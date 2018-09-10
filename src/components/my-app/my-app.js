var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import '@ionic/core';
import { Component, State } from '@stencil/core';
require('electron').webFrame.registerURLSchemeAsPrivileged('file');
const ipcRenderer = require('electron').ipcRenderer;
let MyApp = class MyApp {
    constructor() {
        this.SPINNER_PATH = './assets/images/spinner.gif';
        this.PDF_PLACEHOLDER_PATH = './assets/images/pdf-placeholder.png';
        this.fileNameResults = [];
        this.searchResults = [];
        this.preventSingleClick = false;
        this.textIndexComplete = false;
        this.hideSearchResults = true;
        this.previewDataURI = this.PDF_PLACEHOLDER_PATH;
    }
    componentWillLoad() {
        if (ipcRenderer) {
            ipcRenderer.on('directory-tree-created', (event, arg) => {
                console.log(event);
                this.getDirectoryTree(arg);
                setTimeout(() => {
                    ipcRenderer.send('app-ready');
                }, 3000);
                this.indexPDFText();
            });
            ipcRenderer.on('preview-generated', (event, data) => {
                console.log(event);
                this.createPreviewImage(data);
            });
            ipcRenderer.send('renderer-ready');
        }
    }
    createPreviewImage(data) {
        const scale = 1;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        pdfjsLib.getDocument({ data: data }).then(doc => {
            doc.getPage(1).then(page => {
                const viewport = page.getViewport(scale);
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                const renderer = {
                    canvasContext: ctx,
                    viewport: viewport
                };
                page.render(renderer).then(() => {
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    this.previewDataURI = canvas.toDataURL('image/png');
                });
            });
        });
    }
    getDirectoryTree(directoryTree) {
        this.appDirectoryStructure = directoryTree;
        this.sortDirectories(this.appDirectoryStructure);
        this.directoryTreeJSX = this.createDirectoryTreeJSX(this.appDirectoryStructure);
    }
    indexPDFText() {
        const flatStructure = this.flattenHelper([], this.appDirectoryStructure);
        const worker = new Worker('./assets/scripts/pdf-index.worker.js');
        // Use web worker to prevent UI blocking
        worker.postMessage({ 'flatStructure': flatStructure });
        worker.addEventListener('message', e => {
            this.indexedStructure = e.data;
            this.textIndexComplete = true;
        }, false);
    }
    // Used recursively to drill down through directories to group directories
    sortDirectories(directories) {
        directories.sort(this.compareDirectoriesHelper.bind(this));
    }
    createDirectoryTreeJSX(directory) {
        const directoryLength = directory.length;
        if (directoryLength > 0) {
            return (h("ul", null,
                " ",
                directory.map(item => {
                    const isCollapsibleDirectory = item.items.length > 0;
                    const isEmptyDirectory = item.items.length === 0 && item.type === 'directory';
                    const isFile = item.type === 'file';
                    let itemJSX;
                    if (isCollapsibleDirectory) {
                        itemJSX = (h("div", { class: "collapsible-directory", onClick: event => this.handleDirectoryClick(event) },
                            h("img", { src: "./assets/images/md-arrow-dropright.svg" }),
                            h("span", { class: "item-container" },
                                h("span", { class: "directory" }),
                                item.name)));
                    }
                    if (isEmptyDirectory) {
                        itemJSX = (h("div", null,
                            h("span", { class: "item-container" },
                                h("span", { class: "directory" }),
                                item.name)));
                    }
                    if (isFile) {
                        itemJSX = (h("div", null,
                            h("span", { class: "file-item item-container", onClick: event => this.handleFileClick(event, item), onDblClick: () => this.handleFileDoubleClick(item) },
                                h("span", { class: "pdf" }),
                                item.name)));
                    }
                    return (h("li", null,
                        itemJSX,
                        this.createDirectoryTreeJSX(item.items)));
                })));
        }
    }
    createSearchResultsJSX() {
        let searchJSX = [];
        if (this.searchResults.length === 0 && this.fileNameResults.length === 0) {
            return (h("p", { class: 'no-results' }, "No results match your search"));
        }
        this.fileNameResults.forEach(pdf => {
            searchJSX.push((h("ion-item", { class: "file-item", detail: true, onClick: event => this.handleFileClick(event, pdf), onDblClick: () => this.handleFileDoubleClick(pdf) },
                h("span", { class: "pdf" }),
                h("ion-label", null,
                    h("div", { class: "match-name" }, pdf.name),
                    h("div", { class: "match-path" }, pdf.path),
                    h("div", { class: "pdf-match" }, "Match on the file name")))));
        });
        this.searchResults.forEach(match => {
            searchJSX.push((h("ion-item", { class: "file-item", detail: true, onClick: event => this.handleFileClick(event, match.pdf), onDblClick: () => this.handleFileDoubleClick(match.pdf) },
                h("span", { class: "pdf" }),
                h("ion-label", null,
                    h("div", { class: "match-name" }, match.name),
                    h("div", { class: "match-path" }, match.path),
                    match.pageMatches.map(pageMatch => h("div", { class: "pdf-match" },
                        "Page ",
                        h("strong", null, pageMatch.page),
                        " contains ",
                        h("strong", null, pageMatch.textMatches),
                        " matches"))))));
        });
        return searchJSX;
    }
    handleFileClick(event, pdf) {
        this.timer = setTimeout(() => {
            if (!this.preventSingleClick) {
                this.fileSelected(event, pdf);
            }
            this.preventSingleClick = false;
        }, 200);
    }
    handleDirectoryClick(event) {
        this.previewDataURI = this.PDF_PLACEHOLDER_PATH;
        this.selectedFile = null;
        this.deSelectItems();
        this.toggleDirectory(event);
    }
    handleFileDoubleClick(pdf) {
        clearTimeout(this.timer);
        this.preventSingleClick = true;
        this.openFile(pdf.path);
    }
    fileSelected(event, pdf) {
        const currentFilePath = this.selectedFile ? this.selectedFile.path : '';
        if (pdf.path === currentFilePath) {
            return;
        }
        this.previewDataURI = this.SPINNER_PATH;
        this.deSelectItems();
        event.target.closest('.file-item').classList.add('item-container--selected');
        this.selectedFile = pdf;
        if (ipcRenderer) {
            // In setTimeout as renderer sends and blocks dom updating to show spinner quick enough
            setTimeout(() => {
                ipcRenderer.send('get-preview', pdf.path);
            }, 500);
        }
        else {
            console.warn('Browser cannot get thumbnail');
        }
    }
    openFile(path) {
        if (ipcRenderer && this.selectedFile) {
            ipcRenderer.send('open-file', path);
        }
        else {
            console.warn('Browser cannot open file');
        }
    }
    toggleDirectory(event) {
        const directoryContainer = event.currentTarget.parentNode;
        const isExpanded = directoryContainer.classList.contains('expanded');
        if (isExpanded) {
            directoryContainer.classList.remove('expanded');
        }
        else {
            directoryContainer.classList.add('expanded');
        }
    }
    deSelectItems() {
        const selectedItems = Array.from(document.querySelectorAll('.item-container--selected'));
        selectedItems.forEach(item => item.classList.remove('item-container--selected'));
    }
    searchBarHandler(event) {
        const searchString = event.target.value;
        this.setFilteredResults(searchString);
    }
    setFilteredResults(searchString) {
        const resultsArray = [];
        if (searchString.length === 0) {
            this.searchResults = [];
            this.previewDataURI = this.PDF_PLACEHOLDER_PATH;
            this.selectedFile = null;
            return;
        }
        if (searchString.length > 0 && searchString.length < 3) {
            this.previewDataURI = this.PDF_PLACEHOLDER_PATH;
            this.selectedFile = null;
            return;
        }
        this.hideSearchResults = false;
        this.indexedStructure.forEach(item => {
            const newItem = {
                name: item.name,
                path: item.path,
                pdf: item,
                pageMatches: []
            };
            if (item.type === 'file') {
                item.textContent.forEach((page, index) => {
                    const pageObject = {
                        page: index + 1,
                        textMatches: 0
                    };
                    const matchingSegments = page.filter(textSegment => {
                        return textSegment.toLowerCase().includes(searchString.toLowerCase());
                    });
                    if (matchingSegments.length > 0) {
                        pageObject.textMatches = matchingSegments.length;
                        newItem.pageMatches.push(pageObject);
                    }
                });
                if (newItem.pageMatches.length > 0) {
                    resultsArray.push(newItem);
                }
            }
        });
        this.fileNameResults = this.indexedStructure.filter(item => {
            return item.name.toLowerCase().includes(searchString.toLowerCase());
        });
        this.searchResults = resultsArray;
    }
    compareDirectoriesHelper(a, b) {
        if (a.items.length < b.items.length) {
            this.sortDirectories(b.items);
            return 1;
        }
        else if (a.items.length > b.items.length) {
            this.sortDirectories(a.items);
            return -1;
        }
        return 0;
    }
    flattenHelper(into, item) {
        if (item == null) {
            return into;
        }
        if (Array.isArray(item)) {
            return item.reduce(this.flattenHelper.bind(this), into);
        }
        into.push(item);
        return this.flattenHelper(into, item.items);
    }
    closeSearch() {
        const searchBar = document.querySelector('#Search');
        searchBar.value = '';
        this.searchResults = [];
        this.previewDataURI = this.PDF_PLACEHOLDER_PATH;
        this.selectedFile = null;
        this.hideSearchResults = true;
    }
    render() {
        return [
            h("ion-header", null,
                h("ion-toolbar", { color: "primary" },
                    h("div", { slot: "start" },
                        h("img", { src: "./assets/images/op-circus.png" })),
                    h("div", { class: "e-bundle" },
                        h("img", { src: "./assets/images/e-bundle.png" })))),
            h("ion-content", null,
                h("div", { class: "container" },
                    h("div", { class: "treeview", hidden: !this.hideSearchResults }, this.directoryTreeJSX),
                    h("div", { class: "search-results", hidden: this.hideSearchResults },
                        h("ion-card", { class: "results-card" },
                            h("ion-card-content", null,
                                h("ion-card-title", null, "Search Results..."),
                                h("ion-button", { color: "dark", shape: "round", class: "close-search", onClick: () => this.closeSearch() },
                                    "Close Search Results",
                                    h("ion-icon", { slot: "end", name: "close" })),
                                h("ion-list", null, this.createSearchResultsJSX())))),
                    h("div", { class: "preview-holder" },
                        this.textIndexComplete ?
                            h("ion-searchbar", { id: "Search", animated: true, placeholder: "Minimum 3 characters", onKeyUp: event => this.searchBarHandler(event), onIonCancel: event => this.searchBarHandler(event) }) :
                            h("div", { class: "indexing" },
                                "Indexing PDFs..",
                                h("img", { src: this.SPINNER_PATH })),
                        h("div", { onClick: () => this.selectedFile && this.openFile(this.selectedFile.path) },
                            h("img", { src: this.previewDataURI })),
                        this.selectedFile && this.previewDataURI !== this.SPINNER_PATH &&
                            h("div", { class: "preview-info" },
                                h("p", null,
                                    h("strong", null, this.selectedFile.name)),
                                h("p", null,
                                    "Date - ",
                                    this.selectedFile.creationDate)))))
        ];
    }
};
__decorate([
    State()
], MyApp.prototype, "directoryTreeJSX", void 0);
__decorate([
    State()
], MyApp.prototype, "fileNameResults", void 0);
__decorate([
    State()
], MyApp.prototype, "searchResults", void 0);
__decorate([
    State()
], MyApp.prototype, "preventSingleClick", void 0);
__decorate([
    State()
], MyApp.prototype, "textIndexComplete", void 0);
__decorate([
    State()
], MyApp.prototype, "hideSearchResults", void 0);
__decorate([
    State()
], MyApp.prototype, "timer", void 0);
__decorate([
    State()
], MyApp.prototype, "previewDataURI", void 0);
__decorate([
    State()
], MyApp.prototype, "selectedFile", void 0);
__decorate([
    State()
], MyApp.prototype, "appDirectoryStructure", void 0);
__decorate([
    State()
], MyApp.prototype, "indexedStructure", void 0);
MyApp = __decorate([
    Component({
        tag: 'my-app',
        styleUrl: 'my-app.css'
    })
], MyApp);
export { MyApp };
