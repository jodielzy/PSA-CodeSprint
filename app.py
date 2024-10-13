from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO
import pandas as pd
import csv
import json
from pathlib import Path
from datetime import datetime

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Path to the CSV file
csv_file_path = Path("Updated_Port_Data_with_Split_Departure_Time.csv")

# Load ports data into memory from the CSV file
ports = []
try:
    with open(csv_file_path, mode="r") as file:
        reader = csv.DictReader(file)
        for row in reader:
            # Parse coordinates safely
            try:
                coords = json.loads(row["coords_of_prev_port"].replace("(", "[").replace(")", "]"))
            except json.JSONDecodeError:
                coords = []

            ports.append({
                "id": row["port_id"],
                "coords": coords,
                "distance": row["distance"],
                "vessel_id": row["vessel_id"],
                "departure_date": row["departure_date"],
                "departure_hour": row["departure_hour"]
            })
except FileNotFoundError:
    print(f"Error: CSV file '{csv_file_path}' not found.")
    
def load_vessel_data():
    df = pd.read_csv('Port_Data.csv')
    # Simulate predicted arrival as a column
    df['predicted_arrival'] = pd.to_datetime(df['scheduled_time']) + pd.Timedelta(hours=1)
    return df.to_dict(orient='records')

# API route to fetch vessel data
@app.route('/api/vessels', methods=['GET'])
def get_vessels():
    vessels = load_vessel_data()
    return jsonify(vessels)

@app.route('/static/assignment.js')
def serve_assignment_js():
    return send_from_directory('static', 'assignment.js')

# Route to serve homepage
@app.route('/')
def home():
    return render_template('index.html')

# Route to serve assignment.js as a static file
@app.route('/static/assignment.js')
def assignment_js():
    return send_from_directory('.', 'assignment.js')

# Route for Vessel-to-Port Data Exchange page
@app.route('/vessel-to-port')
def vessel_to_port():
    return render_template('vessel_to_port.html')

# Route for Port-to-Port Data Exchange page
@app.route('/port-to-port')
def port_to_port():
    return render_template('port_to_port.html')

# Serve the map HTML for root access
@app.route('/map')
def serve_map():
    return send_from_directory("public", "map.html")

@app.route('/berth-allocation')
def berth_allocation():
    return render_template('berth_allocation.html') 


# Endpoint to get all ports filtered by departure date
@app.route("/data/ports", methods=["GET"])
def get_ports():
    date = request.args.get("date")
    if not date:
        return jsonify({"error": "Missing required query parameter: date"}), 400

    try:
        selected_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    # Filter ports by the selected date
    filtered_ports = [
        port for port in ports
        if datetime.strptime(port["departure_date"], "%d/%m/%Y").date() == selected_date
    ]

    print(f"Filtered Ports for Date {date}:", filtered_ports)  # Debugging output
    return jsonify(filtered_ports)

# WebSocket event to handle real-time connections
@socketio.on("connect")
def handle_connect():
    print("Client connected")

@socketio.on("message")
def handle_message(message):
    print("Received:", message)
    socketio.send(f"Real-time update: {message}", broadcast=True)

if __name__ == "__main__":
    socketio.run(app, port=5000, debug=True)
