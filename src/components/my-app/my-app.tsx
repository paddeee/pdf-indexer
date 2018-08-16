import '@ionic/core';
import { Component, State, Listen } from '@stencil/core';

declare function require(path: string): any;
const ipcRenderer = require('electron').ipcRenderer;

@Component({
  tag: 'my-app',
  styleUrl: 'my-app.css'
})
export class MyApp {

  @State() directoryStructure: any;
  @State() preventSingleClick: boolean = false;
  @State() timer: any;

  @State() testStructure: any = [
    { name: "Furniture", type: 'directory', items: [
        { name: "Sofas.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
        { name: "Tables & Chairs", type: 'directory', items: [
            { name: "Tables.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
            { name: "Chairs.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' }
          ]
        },
        { name: "Occasional Furniture.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' }
      ]
    },
    { name: "Kitchen Units.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
    { name: "Decor", type: 'directory', items: [
        { name: "Bed Linen.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
        { name: "Carpets.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
        { name: "Curtains & Blinds", type: 'directory', items: [
            { name: "Curtains.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
            { name: "Blinds.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' }
          ]
        }
      ]
    }
  ];

  // Remove selected class from any selected items
  @Listen('body:click')
  handleBodyClick() {
    this.deSelectItems();
  }

  componentWillLoad() {
    this.getDirectoryTree();
  }

  getDirectoryTree() {
    if (ipcRenderer) {

      ipcRenderer.on('directory-tree-created', (event, arg) => {
        console.log(event, arg);
        this.sortDirectories(arg);
        this.directoryStructure = this.createDirectoryTreeJSX(arg);
        console.log(this.directoryStructure);
      });

      ipcRenderer.send('renderer-ready');
    }
  }

  // Used recursively to drill down through directories to group directories
  sortDirectories(directories) {
    directories.sort(this.compareDirectoriesHelper.bind(this))
  }

  compareDirectoriesHelper(a, b) {
    if (a.items.length < b.items.length) {
      this.sortDirectories(b.items);
      return 1;
    } else if (a.items.length > b.items.length) {
      this.sortDirectories(a.items);
      return -1;
    }
    return 0;
  }

  createDirectoryTreeJSX(directory) {
    const directoryLength = directory.length;

    if (directoryLength > 0) {
      return (
        <ul> {
          directory.map(item => {
            const isCollapsibleDirectory = item.items.length > 0;
            const isEmptyDirectory = item.items.length === 0 && item.type === 'directory';
            const isFile = item.type === 'file';
            let itemJSX;

            if (isCollapsibleDirectory) {
              itemJSX = (
                <div class="collapsible-directory" onClick={event => this.handleDirectoryClick(event)}>
                  <img src="./assets/images/md-arrow-dropright.svg" />
                  <span class="item-container">
                    <span class="directory" />{item.name}
                  </span>
                </div>
              )
            }

            if (isEmptyDirectory) {
              itemJSX = (
                <div>
                  <span class="item-container">
                    <span class="directory" />{item.name}
                  </span>
                </div>
              )
            }

            if (isFile) {
              itemJSX = (
                <div>
                  <span class="item-container" onClick={event => this.handleFileClick(event)} onDblClick={() => this.handleFileDoubleClick()}>
                    <span class="pdf" />{item.name}
                  </span>
                </div>
              )
            }

            return (
              <li>
                {itemJSX}
                {this.createDirectoryTreeJSX(item.items)}
              </li>
            )
          })
        }
        </ul>
      )
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
    } else {
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
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>PDF Manager</ion-title>
        </ion-toolbar>
      </ion-header>,
      <ion-content>
        <div class="container">
          <div class="treeview">
            {this.directoryStructure}
          </div>
          <div class="preview-image">
            <ion-card class="image-card">Preview Image</ion-card>
          </div>
        </div>
      </ion-content>
    ];
  }
}
