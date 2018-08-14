import '@ionic/core';
import { Component, State, Listen } from '@stencil/core';
import { Plugins, FilesystemDirectory } from '@capacitor/core';

const { Filesystem } = Plugins;

@Component({
  tag: 'my-app',
  styleUrl: 'my-app.css'
})
export class MyApp {

  @State() directoryStructure: any = [
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

  @State() preventSingleClick: boolean = false;
  @State() timer: any;

  // Remove selected class from any selected items
  @Listen('body:click')
  handleBodyClick() {
    this.deSelectItems();
  }

  componentWillLoad() {
    this.sortDirectories(this.directoryStructure);
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

  async readDirectory() {
    try {
      const ret = await Filesystem.readdir({
        path: 'CPSFiles',
        directory: FilesystemDirectory.Documents
      });
      console.log(ret);
    } catch(e) {
      console.error('Unable to read dir', e);
    }
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
                  <ion-icon name="arrow-dropright"></ion-icon>
                  <span class="item-container">
                    <span class="directory" />{item.text}
                  </span>
                </div>
              )
            }

            if (isEmptyDirectory) {
              itemJSX = (
                <div>
                  <span class="item-container">
                    <span class="directory" />{item.text}
                  </span>
                </div>
              )
            }

            if (isFile) {
              itemJSX = (
                <div>
                  <span class="item-container" onClick={event => this.handleFileClick(event)} onDblClick={() => this.handleFileDoubleClick()}>
                    <span class="pdf" />{item.text}
                  </span>
                </div>
              )
            }

            return (
              <li class="expanded">
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
          <ion-title>Home</ion-title>
        </ion-toolbar>
      </ion-header>,
      <ion-content>
        <div class="container">
          <div class="treeview">
            <p>
              <ion-button onClick={() => this.readDirectory()}>Parse Files</ion-button>
            </p>
            {this.createDirectoryTreeJSX(this.directoryStructure)}
          </div>
          <div class="preview-image">
            <ion-card class="image-card">Preview Image</ion-card>
          </div>
        </div>
      </ion-content>
    ];
  }
}
