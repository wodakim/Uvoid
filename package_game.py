import zipfile
import os

def zip_game():
    zip_filename = 'urban_void_game.zip'
    files_to_zip = [
        'index.html',
        'manifest.json'
    ]
    dirs_to_zip = [
        'assets'
    ]

    # Remove existing zip if it exists
    if os.path.exists(zip_filename):
        os.remove(zip_filename)

    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file in files_to_zip:
            if os.path.exists(file):
                zipf.write(file)
                print(f"Added {file}")
            else:
                print(f"Warning: {file} not found")

        for directory in dirs_to_zip:
            if os.path.exists(directory):
                for root, dirs, files in os.walk(directory):
                    for file in files:
                        file_path = os.path.join(root, file)
                        # zipf.write takes the file path on disk, and the arcname in the zip
                        # Using file_path as arcname preserves the structure relative to root
                        zipf.write(file_path, arcname=file_path)
                        print(f"Added {file_path}")
            else:
                print(f"Warning: {directory} not found")

    print(f"Successfully created {zip_filename}")

if __name__ == "__main__":
    zip_game()
