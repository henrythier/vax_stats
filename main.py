import pandas as pd
import re
import requests
import json
from datetime import datetime
import schedule

def get_data():
    '''
    Function to get the latest excel from RKI and return a dataframe
    '''
    # url of excel
    url = 'https://www.rki.de/DE/Content/InfAZ/N/Neuartiges_Coronavirus/Daten/Impfquotenmonitoring.xlsx;jsessionid=682C4113515029008BB13CC85E346010.internet122?__blob=publicationFile'
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
    cleaned_data_path = './clean/vaccinated.csv'
    data = pd.read_csv(cleaned_data_path, index_col=0, parse_dates=[0])
    data = data.append(new_data)
    data.sort_index(inplace=True)
    data.to_csv(cleaned_data_path)

def update_latest_record(new_data):
    '''
    Function to update the file detailing the latest data (json and csv)
    '''
    # get inhabitants
    inhabitants = pd.read_csv('./inhabitants/inhabitants.csv', index_col=[0])
    vaccinated = new_data.T

    # calculate absolute and relative figures per bundesland
    vaccinated.columns = ['vaccinated_abs']
    vaccinated['inhabitants'] = inhabitants.T.iloc[:,0]
    vaccinated['vaccinated_rel'] = vaccinated['vaccinated_abs'] / vaccinated['inhabitants'] * 100

    # save to csv
    vaccinated.to_csv('./clean/latest.csv')

    # save to json
    j = json.loads(vaccinated.to_json())
    j['Timestamp'] = datetime.now().isoformat()
    with open("./clean/latest.json", "w") as json_file:
        json.dump(j, json_file, indent=4, sort_keys=True)

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
    update_data()
