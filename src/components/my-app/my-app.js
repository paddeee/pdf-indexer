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
        this.searchResults = [];
        this.preventSingleClick = false;
        this.textIndexComplete = true;
        this.hideSearchResults = true;
        this.previewDataURI = this.PDF_PLACEHOLDER_PATH;
        this.browserDirectoryStructure = [
            { name: "Furniture", type: 'directory', items: [
                    { name: "Sofas.pdf", type: 'file', path: "/path/to/Sofas.pdf", items: [] },
                    { name: "Tables & Chairs", type: 'directory', items: [
                            { name: "Tables.pdf", type: 'file', path: "/path/to/Tables.pdf", items: [] },
                            { name: "Chairs.pdf", type: 'file', path: "/path/to/Chairs.pdf", items: [] }
                        ]
                    },
                    { name: "Occasional Furniture.pdf", type: 'file', path: "/path/to/Occasional Furniture.pdf", items: [] }
                ]
            },
            { name: "Kitchen Units.pdf", type: 'file', path: "/path/to/Kitchen Units.pdf", items: [] },
            { name: "Decor", type: 'directory', items: [
                    { name: "Bed Linen.pdf", type: 'file', path: "/path/to/Bed Linen.pdf", items: [] },
                    { name: "Carpets.pdf", type: 'file', path: "/path/to/Carpets.pdf", items: [] },
                    { name: "Curtains & Blinds", type: 'directory', items: [
                            { name: "Curtains.pdf", type: 'file', path: "/path/to/Curtains.pdf", items: [] },
                            { name: "Blinds.pdf", type: 'file', path: "/path/to/Blinds.pdf", items: [], }
                        ]
                    }
                ]
            }
        ];
    }
    componentWillLoad() {
        this.getDirectoryTree();
        ipcRenderer.on('preview-generated', (event, data) => {
            console.log(event);
            this.createPreviewImage(data);
        });
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
    getDirectoryTree() {
        if (ipcRenderer) {
            ipcRenderer.on('directory-tree-created', (event, arg) => {
                console.log(event, arg);
                this.appDirectoryStructure = arg;
                this.sortDirectories(this.appDirectoryStructure);
                this.directoryTreeJSX = this.createDirectoryTreeJSX(this.appDirectoryStructure);
                setTimeout(() => {
                    ipcRenderer.send('app-ready');
                }, 3000);
            });
            ipcRenderer.send('renderer-ready');
        }
        else {
            this.sortDirectories(this.browserDirectoryStructure);
            this.directoryTreeJSX = this.createDirectoryTreeJSX(this.browserDirectoryStructure);
            console.log(this.browserDirectoryStructure);
        }
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
        const flatStructure = this.flattenHelper([], this.appDirectoryStructure);
        //const resultsArray = [];
        if (searchString === '' || searchString.length < 3) {
            this.searchResults = [];
            this.previewDataURI = this.PDF_PLACEHOLDER_PATH;
            this.selectedFile = null;
            return;
        }
        this.searchResults = flatStructure.filter(item => {
            return item.type === 'file' && item.name.toLowerCase().includes(searchString.toLowerCase());
        });
        this.hideSearchResults = false;
        /*flatStructure.forEach(item => {
          const newItem = {
            name: item.name,
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
    
        this.searchResults = resultsArray;*/
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
                    h("div", { class: "treeview", hidden: this.hideSearchResults === false }, this.directoryTreeJSX),
                    h("div", { class: "search-results", hidden: this.hideSearchResults === true },
                        h("ion-card", { class: "results-card" },
                            h("ion-card-content", null,
                                h("ion-card-title", null, "Search Results"),
                                h("ion-list", null, this.searchResults.length > 0 ? this.searchResults.map(pdf => h("ion-item", { class: "file-item", detail: true, onClick: event => this.handleFileClick(event, pdf), onDblClick: () => this.handleFileDoubleClick(pdf) },
                                    h("span", { class: "pdf" }),
                                    h("ion-label", null,
                                        pdf.name,
                                        h("span", { class: "pdf-match" }, pdf.path)))) : h("p", { class: 'no-results' }, "No results match your search"))))),
                    h("div", { class: "preview-holder", onClick: () => this.selectedFile && this.openFile(this.selectedFile.path) },
                        this.textIndexComplete ?
                            h("ion-searchbar", { animated: true, placeholder: "Minimum 3 characters", onIonInput: event => this.searchBarHandler(event), onIonCancel: event => this.searchBarHandler(event) }) :
                            h("div", null, "Indexing PDFs.."),
                        h("img", { src: this.previewDataURI }))))
        ];
    }
};
__decorate([
    State()
], MyApp.prototype, "directoryTreeJSX", void 0);
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
], MyApp.prototype, "browserDirectoryStructure", void 0);
MyApp = __decorate([
    Component({
        tag: 'my-app',
        styleUrl: 'my-app.css'
    })
], MyApp);
export { MyApp };
