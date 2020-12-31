import pandas as pd
import re
import requests
import json
from datetime import datetime
import schedule
import repo_writer
import io

# file paths
git_hub_data_path = 'https://raw.githubusercontent.com/henrythier/vax_stats/main/data/{}'
pop_data_path = git_hub_data_path.format('population.csv')
vax_latest_json_path = git_hub_data_path.format('latest.json')
vax_latest_csv_path = git_hub_data_path.format('latest.csv')
vax_data_path = git_hub_data_path.format('all_time.csv')
rki_data_path = 'https://www.rki.de/DE/Content/InfAZ/N/Neuartiges_Coronavirus/Daten/Impfquotenmonitoring.xlsx;?__blob=publicationFile'

def get_data():
    '''
    Function to get the latest excel from RKI and return a dataframe
    '''
    # url of excel
    url = rki_data_path
    column_name = 'Impfungen kumulativ'

    # get data
    r = requests.get(url)
    df = pd.read_excel(r.content, sheet_name=1, nrows=17, index_col=0)

    # clean bundesland names
    regex = r'[^\w-]'
    df.index = [re.sub(regex, '', x) for x in df.index.values]

    # transpose
    df = df.T.loc[column_name]

    # insere timestamp
    df.name = datetime.now().replace(second=0, microsecond=0)
    df = pd.DataFrame(df).T

    # columns
    df.rename(columns={"Gesamt": "Total"}, inplace=True)

    return df

def add_latest_records(new_data):
    '''
    Function to add the latest data to historic records
    '''
    data = pd.read_csv(vax_data_path, index_col=0, parse_dates=[0])
    data = data.append(new_data)
    data.sort_index(inplace=True)
    s = io.StringIO()
    data.to_csv(s)
    data_csv_string = s.getvalue()
    repo_writer.update_file('data/all_time.csv', 'updated data', data_csv_string)

def update_latest_record(new_data):
    '''
    Function to update the file detailing the latest data (json and csv)
    '''
    # get inhabitants
    inhabitants = pd.read_csv(pop_data_path, index_col=[0])
    vaccinated = new_data.T

    # calculate absolute and relative figures per bundesland
    vaccinated.columns = ['vaccinated_abs']
    vaccinated['inhabitants'] = inhabitants.T.iloc[:,0]
    vaccinated['vaccinated_rel'] = vaccinated['vaccinated_abs'] / vaccinated['inhabitants'] * 100

    # save to csv
    s = io.StringIO()
    vaccinated.to_csv(s)
    vax_csv_string = s.getvalue()
    repo_writer.update_file('data/latest.csv', 'updated latest csv', vax_csv_string)

    # save to json
    j = json.loads(vaccinated.to_json())
    j['Timestamp'] = datetime.now().isoformat()
    vax_json_string = json.dumps(j, indent=4)
    repo_writer.update_file('data/latest.json', 'updated latest json', vax_json_string)

def update_data():
    new_data = get_data()
    add_latest_records(new_data)
    update_latest_record(new_data)

def schedule_updates():
    print('running')
    schedule.every().hour.at(":00").do(update_data)

    while True:
        schedule.run_pending()
        time.sleep(1)

if __name__ == "__main__":
    schedule_updates()
