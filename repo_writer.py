from github import Github
import requests
import json
import os;

token =  os.environ['token']
repo_path = 'henrythier/vax_stats'

# authenticate
g = Github(token)

def update_file(file_path, commit_message, string_content):
    # get repo
    repo = g.get_repo('henrythier/vax_stats')

    # get sha
    contents = repo.get_contents(file_path)

    # update file
    repo.update_file(contents.path, commit_message, string_content, contents.sha, branch="main")
