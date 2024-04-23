from flask import Flask, render_template, request, redirect, url_for, flash
from werkzeug.utils import secure_filename
import os
import pymysql
from google.cloud import storage

application = Flask(__name__, template_folder="app/HTML")
application.secret_key = 'ben'

# Database connection details
# Modify these to your Cloud SQL instance details
CLOUD_SQL_CONNECTION_NAME = 'se422-421121:us-central1:se422-sqlservers'
DB_USER = 'user'
DB_PASSWORD = 'pass'
DB_NAME = 'se422-sqlserver'

# Google Cloud Storage Bucket details
BUCKET_NAME = 'photos_se422'

# Function to get DB connection
def get_db_connection():
    db = pymysql.connect(host='localhost',
                         user=DB_USER,
                         password=DB_PASSWORD,
                         db=DB_NAME,
                         cursorclass=pymysql.cursors.DictCursor)
    return db

@application.route("/", methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                sql = "SELECT * FROM users WHERE username = %s AND password = %s"
                cursor.execute(sql, (username, password))
                result = cursor.fetchone()
                if result:
                    flash('Login successful!')
                    return redirect(url_for('home'))
                else:
                    flash('Login Unsuccessful. Please check username and password')
        finally:
            connection.close()

    return render_template('login.html')

@application.route("/new_account", methods=['GET', 'POST'])
def new_account():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                sql = "INSERT INTO users (username, password) VALUES (%s, %s)"
                cursor.execute(sql, (username, password))
            connection.commit()
            flash('Account created successfully! Please login.')
            return redirect(url_for('login'))
        except pymysql.err.IntegrityError:
            flash('Username already exists. Please choose another one.')
        finally:
            connection.close()
    return render_template('new_account.html')

@application.route("/home", methods=['POST', 'GET'])
def home():   
    try:
        storage_client = storage.Client()
        bucket = storage_client.get_bucket(BUCKET_NAME)
        blobs = bucket.list_blobs()

        images = []
        for blob in blobs:
            image_url = f'https://storage.googleapis.com/{BUCKET_NAME}/{blob.name}'
            caption = blob.name  # You may need to modify this depending on how your images are named
            images.append({'url': image_url, 'caption': caption})
    except Exception as e:
        return render_template('home.html')
        return f"Error: {str(e)}", 500
    return render_template('home.html', images=images)

@application.route('/upload', methods=['POST'])
def upload_file():
    if request.method == 'POST':
        try:
            file = request.files['file']
            if file and file.filename.endswith(('.jpg')):

                filename = secure_filename(file.filename)
                temp_file_path = os.path.join('/tmp', filename)
                file.save(temp_file_path)

                storage_client = storage.Client()
                bucket = storage_client.get_bucket(BUCKET_NAME)
                blob = bucket.blob(filename)
                blob.upload_from_filename(temp_file_path)

                os.remove(temp_file_path)
                
                return redirect(url_for('home'))
            else:
                return 'File format not supported!'
        except Exception as e:
            return f'An error occurred: {e}'

if __name__ == '__main__':
    application.run(host='0.0.0.0', port='8080', debug=True)
