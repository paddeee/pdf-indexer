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
  @State() fileNameResults: any = [];
  @State() searchResults: any = [];
  @State() preventSingleClick: boolean = false;
  @State() textIndexComplete: boolean = false;
  @State() hideSearchResults: boolean = true;
  @State() timer: any;
  @State() previewDataURI: string = this.PDF_PLACEHOLDER_PATH;
  @State() selectedFile: any;

  @State() appDirectoryStructure: any;
  @State() indexedStructure: any;

  componentWillLoad() {

    if (ipcRenderer) {

      ipcRenderer.on('directory-tree-created', (event, arg) => {
        console.log(event);
        this.getDirectoryTree(arg);
        setTimeout(() => {
          ipcRenderer.send('app-ready');
        },3000);
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
        })
      })
    })
  }

  getDirectoryTree(directoryTree) {
    this.appDirectoryStructure = directoryTree;
    this.sortDirectories(this.appDirectoryStructure);
    this.directoryTreeJSX = this.createDirectoryTreeJSX(this.appDirectoryStructure);
  }

  indexPDFText()  {
    const flatStructure = this.flattenHelper([], this.appDirectoryStructure);
    const worker = new Worker('./assets/scripts/pdf-index.worker.js');

    // Use web worker to prevent UI blocking
    worker.postMessage({'flatStructure': flatStructure});
    worker.addEventListener('message', e => {
      this.indexedStructure = e.data;
      this.textIndexComplete = true;
    }, false);
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

  createSearchResultsJSX() {

    let searchJSX = [];

    if (this.searchResults.length === 0 && this.fileNameResults.length === 0) {
      return (<p class='no-results'>No results match your search</p>);
    }

    this.fileNameResults.forEach(pdf => {
      searchJSX.push((<ion-item class="file-item"
      detail
      onClick={event => this.handleFileClick(event, pdf)}
      onDblClick={() => this.handleFileDoubleClick(pdf)}>
      <span class="pdf" />
        <ion-label>
        <div class="match-name">{pdf.name}</div>
        <div class="match-path">{pdf.path}</div>
        <div class="pdf-match">Match on the file name</div>
      </ion-label>
      </ion-item>))
    });

    this.searchResults.forEach(match => {
      searchJSX.push((<ion-item class="file-item"
                detail
                onClick={event => this.handleFileClick(event, match.pdf)}
                onDblClick={() => this.handleFileDoubleClick(match.pdf)}>
        <span class="pdf" />
        <ion-label>
          <div class="match-name">{match.name}</div>
          <div class="match-path">{match.path}</div>
          {match.pageMatches.map(pageMatch =>
            <div class="pdf-match">Page <strong>{pageMatch.page}</strong> contains <strong>{pageMatch.textMatches}</strong> matches</div>
          )}
        </ion-label>
      </ion-item>))
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
    const searchBar = document.querySelector('#Search') as HTMLIonSearchbarElement;
    searchBar.value = '';
    this.searchResults = [];
    this.previewDataURI = this.PDF_PLACEHOLDER_PATH;
    this.selectedFile = null;
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
      {this.createSearchResultsJSX()}
    </ion-list>
    </ion-card-content>
    </ion-card>
    </div>
    <div class="preview-holder">
    {this.textIndexComplete ?
    <ion-searchbar
      id="Search"
      animated
      placeholder="Minimum 3 characters"
      onKeyUp={event => this.searchBarHandler(event)}
      onIonCancel={event => this.searchBarHandler(event)}/> :
    <div class="indexing">
      Indexing PDFs..<img src={this.SPINNER_PATH} />
    </div>}
    <div onClick={() => this.selectedFile && this.openFile(this.selectedFile.path)}>
      <img src={this.previewDataURI} />
    </div>
    {this.selectedFile && this.previewDataURI !== this.SPINNER_PATH &&
    <div class="preview-info">
      <p><strong>{this.selectedFile.name}</strong></p>
    </div>
    }
    </div>
    </div>
    </ion-content>
  ];
  }
  }
