import '@ionic/core';
import { Component, State } from '@stencil/core';
require('electron').webFrame.registerURLSchemeAsPrivileged('file');

declare var require: any;
declare const pdfjsLib: any;

const ipcRenderer = require('electron').ipcRenderer;

@Component({
  tag: 'my-app',
  styleUrl: 'my-app.css'
})
export class MyApp {

  SPINNER_PATH = './assets/images/spinner.gif';
  PDF_PLACEHOLDER_PATH = './assets/images/pdf-placeholder.png';

  @State() directoryTreeJSX: any;
  @State() searchResults: any = [];
  @State() preventSingleClick: boolean = false;
  @State() textIndexComplete: boolean = true;
  @State() hideSearchResults: boolean = true;
  @State() timer: any;
  @State() previewDataURI: string = this.PDF_PLACEHOLDER_PATH;
  @State() selectedFile: any;

  @State() appDirectoryStructure: any;
  @State() browserDirectoryStructure: any = [
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
        })
      })
    })
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
        },3000);
      });

      ipcRenderer.send('renderer-ready');
    } else {
      this.sortDirectories(this.browserDirectoryStructure);
      this.directoryTreeJSX = this.createDirectoryTreeJSX(this.browserDirectoryStructure);
      console.log(this.browserDirectoryStructure);
    }
  }

  // Used recursively to drill down through directories to group directories
  sortDirectories(directories) {
    directories.sort(this.compareDirectoriesHelper.bind(this))
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
                  <span class="file-item item-container" onClick={event => this.handleFileClick(event, item)} onDblClick={() => this.handleFileDoubleClick(item)}>
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
    } else {
      console.warn('Browser cannot get thumbnail');
    }
  }

  openFile(path: string) {

    if (ipcRenderer && this.selectedFile) {
      ipcRenderer.send('open-file', path);
    } else {
      console.warn('Browser cannot open file');
    }
  }

  toggleDirectory(event) {
    const directoryContainer = event.currentTarget.parentNode;
    const isExpanded = directoryContainer.classList.contains('expanded');

    if (isExpanded) {
      directoryContainer.classList.remove('expanded');
    } else {
      directoryContainer.classList.add('expanded');
    }
  }

  deSelectItems() {
    const selectedItems = Array.from(document.querySelectorAll('.item-container--selected'));
    selectedItems.forEach(item => item.classList.remove('item-container--selected'));
  }

  searchBarHandler(event: any) {
    const searchString = event.target.value;

    this.setFilteredResults(searchString);
  }

  setFilteredResults(searchString) {
    const flatStructure = this.flattenHelper([], this.appDirectoryStructure);
    //const resultsArray = [];

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
    } else if (a.items.length > b.items.length) {
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
    this.hideSearchResults = true;
  }


  render() {
    return [
      <ion-header>
        <ion-toolbar color="primary">
        <div slot="start">
          <img src="./assets/images/op-circus.png" />
        </div>
        <div class="e-bundle">
          <img src="./assets/images/e-bundle.png" />
        </div>
      </ion-toolbar>
      </ion-header>,
      <ion-content>
        <div class="container">
          <div class="treeview" hidden={!this.hideSearchResults}>
            {this.directoryTreeJSX}
          </div>
          <div class="search-results" hidden={this.hideSearchResults}>
            <ion-card class="results-card">
              <ion-card-content>
                <ion-card-title>Search Results...</ion-card-title>

                  <ion-button color="dark" shape="round" class="close-search" onClick={() => this.closeSearch()}>
                    Close Search Results
                    <ion-icon slot="end" name="close"></ion-icon>
                  </ion-button>
                  <ion-list>
                  {this.searchResults.length > 0 ? this.searchResults.map(pdf =>
                    <ion-item
                      class="file-item"
                      detail
                      onClick={event => this.handleFileClick(event, pdf)}
                      onDblClick={() => this.handleFileDoubleClick(pdf)}>
                      <span class="pdf" />
                      <ion-label>
                        {pdf.name}
                        <span class="pdf-match">{pdf.path}</span>
                      </ion-label>
                    </ion-item>
                  ) : <p class='no-results'>No results match your search</p>}
                  </ion-list>
            </ion-card-content>
            </ion-card>
          </div>
          <div class="preview-holder">
          {this.textIndexComplete ?
            <ion-searchbar animated placeholder="Minimum 3 characters" onKeyUp={event => this.searchBarHandler(event)}
            onIonCancel={event => this.searchBarHandler(event)}/> :
            <div>Indexing PDFs..</div>}
            <div onClick={() => this.selectedFile && this.openFile(this.selectedFile.path)}>
              <img src={this.previewDataURI} />
            </div>
            {this.selectedFile && this.previewDataURI !== this.SPINNER_PATH &&
            <div class="preview-info">
              <p><strong>{this.selectedFile.name}</strong></p>
              <p>Date - {this.selectedFile.creationDate}</p>
            </div>
            }
          </div>
        </div>
      </ion-content>
    ];
  }
}
