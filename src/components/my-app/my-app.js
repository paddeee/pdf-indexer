var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import '@ionic/core';
import { Component, State, Listen } from '@stencil/core';
import { Plugins, FilesystemDirectory } from '@capacitor/core';
const { Filesystem } = Plugins;
let MyApp = class MyApp {
    constructor() {
        this.directoryStructure = [
            { text: "Furniture", type: 'directory', items: [
                    { text: "Sofas.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
                    { text: "Tables & Chairs", type: 'directory', items: [
                            { text: "Tables.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
                            { text: "Chairs.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' }
                        ]
                    },
                    { text: "Occasional Furniture.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' }
                ]
            },
            { text: "Kitchen Units.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
            { text: "Decor", type: 'directory', items: [
                    { text: "Bed Linen.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
                    { text: "Carpets.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
                    { text: "Curtains & Blinds", type: 'directory', items: [
                            { text: "Curtains.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
                            { text: "Blinds.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' }
                        ]
                    }
                ]
            }
        ];
        this.preventSingleClick = false;
    }
    // Remove selected class from any selected items
    handleBodyClick() {
        this.deSelectItems();
    }
    componentWillLoad() {
        this.sortDirectories(this.directoryStructure);
    }
    // Used recursively to drill down through directories to group directories
    sortDirectories(directories) {
        directories.sort(this.compareDirectoriesHelper.bind(this));
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
    async readDirectory() {
        try {
            const ret = await Filesystem.readdir({
                path: 'CPSFiles',
                directory: FilesystemDirectory.Documents
            });
            console.log(ret);
        }
        catch (e) {
            console.error('Unable to read dir', e);
        }
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
                            h("ion-icon", { name: "arrow-dropright" }),
                            h("span", { class: "item-container" },
                                h("span", { class: "directory" }),
                                item.text)));
                    }
                    if (isEmptyDirectory) {
                        itemJSX = (h("div", null,
                            h("span", { class: "item-container" },
                                h("span", { class: "directory" }),
                                item.text)));
                    }
                    if (isFile) {
                        itemJSX = (h("div", null,
                            h("span", { class: "item-container", onClick: event => this.handleFileClick(event), onDblClick: () => this.handleFileDoubleClick() },
                                h("span", { class: "pdf" }),
                                item.text)));
                    }
                    return (h("li", { class: "expanded" },
                        itemJSX,
                        this.createDirectoryTreeJSX(item.items)));
                })));
        }
    }
    handleFileClick(event) {
        this.timer = setTimeout(() => {
            if (!this.preventSingleClick) {
                this.fileSelected(event);
            }
            this.preventSingleClick = false;
        }, 200);
    }
    handleDirectoryClick(event) {
        this.toggleDirectory(event);
    }
    handleFileDoubleClick() {
        clearTimeout(this.timer);
        this.preventSingleClick = true;
        this.openFile();
    }
    fileSelected(event) {
        event.target.classList.add('item-container--selected');
        console.log('Show Preview of File Selected', event.target);
    }
    openFile() {
        console.log('Open File');
    }
    toggleDirectory(event) {
        const directoryContainer = event.currentTarget.parentNode;
        const itemGroup = event.currentTarget.nextSibling;
        const isExpanded = directoryContainer.classList.contains('expanded');
        if (isExpanded) {
            directoryContainer.classList.remove('expanded');
        }
        else {
            directoryContainer.classList.add('expanded');
        }
        console.log(directoryContainer, itemGroup);
    }
    deSelectItems() {
        const selectedItems = Array.from(document.querySelectorAll('.item-container--selected'));
        selectedItems.forEach(item => item.classList.remove('item-container--selected'));
        console.log('Show Default Preview', event.target);
    }
    render() {
        return [
            h("ion-header", null,
                h("ion-toolbar", { color: "primary" },
                    h("ion-title", null, "Home"))),
            h("ion-content", null,
                h("div", { class: "container" },
                    h("div", { class: "treeview" },
                        h("p", null,
                            h("ion-button", { onClick: () => this.readDirectory() }, "Parse Files")),
                        this.createDirectoryTreeJSX(this.directoryStructure)),
                    h("div", { class: "preview-image" },
                        h("ion-card", { class: "image-card" }, "Preview Image"))))
        ];
    }
};
__decorate([
    State()
], MyApp.prototype, "directoryStructure", void 0);
__decorate([
    State()
], MyApp.prototype, "preventSingleClick", void 0);
__decorate([
    State()
], MyApp.prototype, "timer", void 0);
__decorate([
    Listen('body:click')
], MyApp.prototype, "handleBodyClick", null);
MyApp = __decorate([
    Component({
        tag: 'my-app',
        styleUrl: 'my-app.css'
    })
], MyApp);
export { MyApp };
