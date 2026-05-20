/**
 * Firebase Realtime Database REST API Client for Google Apps Script
 */
const Firebase = {
  /**
   * Mengamankan kunci database dari karakter terlarang Firebase (. # $ [ ] /)
   */
  escapeKey: function(key) {
    if (!key) return "";
    return key.toString()
              .replace(/%/g, '%25')
              .replace(/\./g, '%2E')
              .replace(/#/g, '%23')
              .replace(/\$/g, '%24')
              .replace(/\[/g, '%5B')
              .replace(/\]/g, '%5D')
              .replace(/\//g, '%2F');
  },

  /**
   * Mengembalikan kunci database ke karakter aslinya
   */
  unescapeKey: function(key) {
    if (!key) return "";
    return key.toString()
              .replace(/%2F/g, '/')
              .replace(/%5D/g, ']')
              .replace(/%5B/g, '[')
              .replace(/%24/g, '$')
              .replace(/%23/g, '#')
              .replace(/%2E/g, '.')
              .replace(/%25/g, '%');
  },

  getDbUrl: function() {
    const prop = PropertiesService.getScriptProperties().getProperty('FIREBASE_DB_URL');
    if (prop) return prop.replace(/\/$/, "");
    return (SETTINGS.FIREBASE_DB_URL || "").replace(/\/$/, "");
  },

  getSecret: function() {
    return PropertiesService.getScriptProperties().getProperty('FIREBASE_SECRET') || SETTINGS.FIREBASE_SECRET || "";
  },

  /**
   * Mengambil data dari path tertentu
   * @param {string} path - Path database (contoh: "users" atau "jawaban/OPD_A")
   */
  get: function(path) {
    const dbUrl = this.getDbUrl();
    const secret = this.getSecret();
    if (!dbUrl) throw new Error("Firebase Database URL belum dikonfigurasi.");

    const url = `${dbUrl}/${path}.json${secret ? '?auth=' + secret : ''}`;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`Firebase GET Error [${response.getResponseCode()}]: ${response.getContentText()}`);
    }
    return JSON.parse(response.getContentText());
  },

  /**
   * Menyimpan data dengan menimpa (overwrite) data di path tertentu
   * @param {string} path - Path database
   * @param {Object} data - Data yang akan disimpan
   */
  put: function(path, data) {
    const dbUrl = this.getDbUrl();
    const secret = this.getSecret();
    if (!dbUrl) throw new Error("Firebase Database URL belum dikonfigurasi.");

    const url = `${dbUrl}/${path}.json${secret ? '?auth=' + secret : ''}`;
    const options = {
      method: 'put',
      contentType: 'application/json',
      payload: JSON.stringify(data),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
      throw new Error(`Firebase PUT Error [${response.getResponseCode()}]: ${response.getContentText()}`);
    }
    return JSON.parse(response.getContentText());
  },

  /**
   * Memperbarui sebagian data di path tertentu tanpa menimpa data lainnya
   * @param {string} path - Path database
   * @param {Object} data - Objek data yang ingin diperbarui
   */
  patch: function(path, data) {
    const dbUrl = this.getDbUrl();
    const secret = this.getSecret();
    if (!dbUrl) throw new Error("Firebase Database URL belum dikonfigurasi.");

    const url = `${dbUrl}/${path}.json${secret ? '?auth=' + secret : ''}`;
    const options = {
      method: 'patch',
      contentType: 'application/json',
      payload: JSON.stringify(data),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
      throw new Error(`Firebase PATCH Error [${response.getResponseCode()}]: ${response.getContentText()}`);
    }
    return JSON.parse(response.getContentText());
  },

  /**
   * Menambahkan data baru ke dalam list dengan auto-generated key (Push ID)
   * @param {string} path - Path database
   * @param {Object} data - Data yang ingin ditambahkan
   */
  post: function(path, data) {
    const dbUrl = this.getDbUrl();
    const secret = this.getSecret();
    if (!dbUrl) throw new Error("Firebase Database URL belum dikonfigurasi.");

    const url = `${dbUrl}/${path}.json${secret ? '?auth=' + secret : ''}`;
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(data),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
      throw new Error(`Firebase POST Error [${response.getResponseCode()}]: ${response.getContentText()}`);
    }
    return JSON.parse(response.getContentText());
  },

  /**
   * Menghapus data di path tertentu
   * @param {string} path - Path database
   */
  remove: function(path) {
    const dbUrl = this.getDbUrl();
    const secret = this.getSecret();
    if (!dbUrl) throw new Error("Firebase Database URL belum dikonfigurasi.");

    const url = `${dbUrl}/${path}.json${secret ? '?auth=' + secret : ''}`;
    const options = {
      method: 'delete',
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
      throw new Error(`Firebase DELETE Error [${response.getResponseCode()}]: ${response.getContentText()}`);
    }
    return true;
  },

  /**
   * Caching helper untuk Master Pertanyaan
   */
  getCachedMasterPertanyaan: function() {
    const cache = CacheService.getScriptCache();
    const cached = cache.get("master_pertanyaan_map");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    const pert = this.get("master_pertanyaan") || {};
    try {
      cache.put("master_pertanyaan_map", JSON.stringify(pert), 1800); // 30 menit
    } catch (e) {}
    return pert;
  },

  clearMasterPertanyaanCache: function() {
    const cache = CacheService.getScriptCache();
    cache.remove("master_pertanyaan_map");
  },

  /**
   * Caching helper untuk Master OPD
   */
  getCachedMasterOPD: function() {
    const cache = CacheService.getScriptCache();
    const cached = cache.get("master_opd_list");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    const opd = this.get("master_opd") || [];
    try {
      cache.put("master_opd_list", JSON.stringify(opd), 1800); // 30 menit
    } catch (e) {}
    return opd;
  },

  clearMasterOPDCache: function() {
    const cache = CacheService.getScriptCache();
    cache.remove("master_opd_list");
  }
};
