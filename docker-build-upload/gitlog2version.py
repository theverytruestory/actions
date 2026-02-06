from git import Repo
import json
import argparse


def main(path):
    repo = Repo(path)
    commit = repo.head.commit
    commit_hash, branch = commit.name_rev.split(" ", 1)
    version_info = {
        "git author": f"{commit.author.name} <{commit.author.email}>",
        "git branch": str(branch),
        "git commit": str(commit_hash),
        "git date": str(commit.committed_datetime.isoformat()),
        "git hash": str(commit.hexsha[:7]),
        "git subject": str(commit.message).strip(),
    }
    return version_info


if __name__ == '__main__':
    arg_parser = argparse.ArgumentParser()
    arg_parser.add_argument("-p", "--path", help="Path to the git repository",
                            default=".")
    arg_parser.add_argument("-o", "--output", help="file to save the version info as JSON",
                            default="version.json")
    args = arg_parser.parse_args()
    version_info = main(args.path)
    with open(args.output, "w") as f:
        json.dump(version_info, f, indent=4, ensure_ascii=False)

