const fs = require ('fs');
const pdfjsLib = require('pdfjs-dist');

this.addEventListener('message', e => {
  const flatStructure = e.data.flatStructure;
  let promises = [];

  flatStructure.forEach(item => {
    if (item.type === 'file') {

      const textPromise = new Promise(resolve => {

      getPDFTextContent(item.path).then(textContent => {
        item.textContent = textContent;
        resolve(item);
        });
      });

      promises.push(textPromise);
    }
  });

  Promise.all(promises)
    .then(results => {
      this.postMessage(results);
    })
    .catch(e => {
      // Handle errors here
      console.log(e);
    });

}, false);

function getPDFTypedArray(pdfURL) {
  return new Uint8Array(fs.readFileSync(pdfURL));
}

function getPDFTextContent(pdfPath) {

  return new Promise(resolve => {

    const pdfBlob = this.getPDFTypedArray(pdfPath);

    pdfjsLib.getDocument(pdfBlob).then(function (doc) {
      const numPages = doc.numPages;
      let promises = [];

      for (let i = 1; i <= numPages; i++) {
        promises.push(getContent(i));
      }

      function getContent(pageNum) {

        return new Promise(resolve => {

          doc.getPage(pageNum).then(page => {

            page.getTextContent().then(content => {

              // Content contains lots of information about the text layout and
              // styles, but we need only strings
              const strings = content.items.map(item => {
                return item.str;
              });
              resolve(strings);
            })
          })
        })
      }

      Promise.all(promises)
        .then(results => {
          resolve(results);
        })
        .catch(e => {
          // Handle errors here
          console.log(e);
        });
    })
  })
}
