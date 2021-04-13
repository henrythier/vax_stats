import pandas as pd
import re
import requests
import json
from datetime import datetime
import schedule
import repo_writer
import io
import time

# file paths
git_hub_data_path = 'https://raw.githubusercontent.com/henrythier/vax_stats/main/data/{}'
pop_data_path = git_hub_data_path.format('population.csv')
vax_latest_json_path = git_hub_data_path.format('latest.json')
vax_latest_csv_path = git_hub_data_path.format('latest.csv')
vax_data_path = git_hub_data_path.format('all_time.csv')
vax_data_second_path = git_hub_data_path.format('all_time_second.csv')
rki_data_path = 'https://www.rki.de/DE/Content/InfAZ/N/Neuartiges_Coronavirus/Daten/Impfquotenmonitoring.xlsx;?__blob=publicationFile'


def get_data():
    '''
    Function to get the latest excel from RKI and return a pandas dataframe
    '''
    # url of excel
    url = rki_data_path
    first_col = 'Gesamt'
    second_col = 'total_second'

    # get data
    r = requests.get(url)
    df = pd.read_excel(r.content, sheet_name=1, nrows=18, index_col=1, skiprows=3)
    df = df[['Gesamt', 'Gesamt.1']]
    df.columns = [first_col, second_col]

    regex = r'[^\w-]'
    df.index = [re.sub(regex, '', x) for x in df.index.values]

    # transpose
    first = df.T.loc[first_col]
    second = df.T.loc[second_col]

    # insert timestamp
    first.name = datetime.now().replace(second=0, microsecond=0)
    second.name = datetime.now().replace(second=0, microsecond=0)

    # convert to dataframe
    first = pd.DataFrame(first).T
    second = pd.DataFrame(second).T

    # rename columns
    first.rename(columns={"Gesamt": "Total"}, inplace=True)
    second.rename(columns={"Gesamt": "Total"}, inplace=True)
    
    # absolute numbers
    absolute = pd.read_excel(r.content, sheet_name='Impfungen_proTag', index_col=0)
    absolute = absolute.loc['Gesamt']
    first_abs = absolute['Einmal geimpft']
    second_abs = absolute['Vollständig geimpft']
    
    vaccinations = [first, second, first_abs, second_abs]
    return vaccinations


def add_latest_records(new_data, data_path, rel_data_path):
    '''
    NO LONGER USED AFTER RKI CHANGE DATA FORMAT 09/04/2021
    Function to add the latest data to historic records
    '''
    data = pd.read_csv(data_path, index_col=0, parse_dates=[0])
    data = data.append(new_data)
    data.sort_index(inplace=True)
    s = io.StringIO()
    data.to_csv(s)
    data_csv_string = s.getvalue()
    repo_writer.update_file(rel_data_path, 'updated data', data_csv_string)


def update_latest_record(new_data, new_abs, path):
    '''
    CSV NO LONGER SUPPORTS ABSOLUTE FIGURES
    Function to update the file detailing the latest data (json and csv)
    '''
    # transpose so länder
    vaccinated = new_data.T

    # rename column
    vaccinated.columns = ['vaccinated_rel']

    # save to csv
    x = io.StringIO()
    vaccinated.to_csv(x)
    vax_csv_string = x.getvalue()
    repo_writer.update_file('data/{}.csv'.format(path), 'updated {} csv'.format(path), vax_csv_string)

    # save to json
    j = json.loads(vaccinated.to_json())
    j.update({'vaccinated_abs': {'Total': new_abs}})
    j['Timestamp'] = datetime.now().isoformat()
    vax_json_string = json.dumps(j, indent=4)
    repo_writer.update_file('data/{}.json'.format(path), 'updated {} json'.format(path), vax_json_string)


def update_data():
    new_data = get_data()
    update_latest_record(new_data[0], new_data[2], 'latest')
    update_latest_record(new_data[1], new_data[3], 'latest_second')


def schedule_updates():
    print('running')
    schedule.every().hour.at(":00").do(update_data)

    while True:
        schedule.run_pending()
        time.sleep(1)


if __name__ == "__main__":
    schedule_updates()
