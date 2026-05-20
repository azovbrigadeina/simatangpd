/**
 * APLIKASI PEKPPP MANDIRI - KABUPATEN MUARO JAMBI
 * Main Entry Point & Helpers
 */

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle('SIMatang-PD - Kab. Muaro Jambi')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper function to include HTML files in the main template
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
