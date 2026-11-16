import os
import zipfile

src_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
dest_zip = r'C:\Users\evgen\Desktop\car-detailing-studio-latest.zip'
ignored = {'node_modules', '.next', '.git'}

count = 0
with zipfile.ZipFile(dest_zip, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(src_dir):
        dirs[:] = [d for d in dirs if d not in ignored]
        for f in files:
            if f.endswith('.zip') or f.endswith('.tsbuildinfo'):
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, src_dir)
            arcname = rel_path.replace('\\', '/')
            z.write(full_path, arcname)
            count += 1

stat = os.stat(dest_zip)
print(f'Successfully created {destZip if "destZip" in locals() else dest_zip} ({stat.st_size / 1024 / 1024:.2f} MB, {count} files) with POSIX / paths')
