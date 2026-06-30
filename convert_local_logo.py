import base64
import re
import os

logo_path = "logo.png"
html_path = "Index.html"

if not os.path.exists(logo_path):
    # Coba cari file .png atau .jpg lain di directory
    files = [f for f in os.listdir(".") if f.lower().endswith((".png", ".jpg", ".jpeg"))]
    if files:
        print(f"Ditemukan file gambar: {files}. Menggunakan {files[0]}")
        logo_path = files[0]
    else:
        print("Error: File logo.png tidak ditemukan di folder proyek.")
        print("Silakan taruh file logo Anda di folder ini dengan nama 'logo.png' lalu jalankan script ini kembali.")
        exit(1)

try:
    print(f"Membaca {logo_path}...")
    with open(logo_path, "rb") as f:
        img_data = f.read()
        
    base64_data = base64.b64encode(img_data).decode("utf-8")
    
    # Deteksi mime type berdasarkan ekstensi
    ext = os.path.splitext(logo_path)[1].lower()
    mime = "image/png"
    if ext in (".jpg", ".jpeg"):
        mime = "image/jpeg"
    elif ext == ".gif":
        mime = "image/gif"
        
    data_url = f"data:{mime};base64,{base64_data}"
    print(f"Berhasil konversi (panjang base64: {len(base64_data)} karakter).")
    
    print("Membaca Index.html...")
    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()
        
    # Cari tag img logo dan ganti src-nya
    pattern = r'(<img\s+src=")[^"]+("[\s\S]*?alt="SIMatang Logo")'
    if re.search(pattern, html_content):
        new_content = re.sub(pattern, f"\\1{data_url}\\2", html_content)
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Sukses menanamkan logo lokal ke Index.html!")
    else:
        print("Error: Tag img logo tidak ditemukan di Index.html.")
        
except Exception as e:
    print(f"Error: {e}")
