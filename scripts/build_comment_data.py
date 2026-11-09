"""Build public comment data; tokens are used only against api.github.com in Actions."""
import concurrent.futures
import hashlib
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
REPO = 'traviszzzhang/day-day-study-dance-with-wang'
VIDEOS = json.loads((ROOT / 'video-library.json').read_text())
FIELDS = 'id author { login } createdAt url isMinimized deletedAt bodyHTML'
COMMENTS = f'''comments(first:50,after:$after) {{ totalCount pageInfo {{ hasNextPage endCursor }} nodes {{ {FIELDS} replies(last:100) {{ totalCount nodes {{ {FIELDS} }} }} }} }}'''


def request_json(url, payload=None, token=None):
    headers = {'User-Agent': 'dayday-comment-data', 'Accept': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    if payload:
        headers['Content-Type'] = 'application/json'
    for attempt in range(3):
        try:
            req = Request(url, data=json.dumps(payload).encode() if payload else None, headers=headers)
            with urlopen(req, timeout=45) as response:
                return json.load(response)
        except HTTPError as exc:
            if exc.code == 404:
                try:
                    return json.loads(exc.read())
                except ValueError:
                    raise RuntimeError('Comment endpoint not found') from None
            if attempt == 2 or exc.code not in (429, 500, 502, 503, 504):
                raise RuntimeError(f'Comment request failed: HTTP {exc.code}') from None
        except (TimeoutError, OSError):
            if attempt == 2:
                raise RuntimeError('Comment request timed out') from None
        time.sleep(2 ** attempt)


def graphql(query, variables, token):
    result = request_json('https://api.github.com/graphql', {'query': query, 'variables': variables}, token)
    if result.get('errors') or not result.get('data'):
        raise RuntimeError('GitHub could not provide discussion data')
    return result['data']


def github_data(token):
    owner, name = REPO.split('/')
    discussion_query = '''query($owner:String!,$name:String!,$cursor:String){ repository(owner:$owner,name:$name){ discussions(first:50,after:$cursor){pageInfo{hasNextPage endCursor} nodes{id title body url}}}}'''
    comment_query = f'''query($id:ID!,$after:String) {{ node(id:$id) {{ ... on Discussion {{ {COMMENTS} }} }} }}'''
    hashes = {hashlib.sha1(f"dayday-video-{v['id']}".encode()).hexdigest(): v['id'] for v in VIDEOS}
    known = {v['id'] for v in VIDEOS}
    result = {v['id']: {'count': 0, 'parents': []} for v in VIDEOS}
    cursor = None
    while True:
        repository = graphql(discussion_query, {'owner': owner, 'name': name, 'cursor': cursor}, token)['repository']
        if repository is None:
            raise RuntimeError('Repository not accessible')
        connection = repository['discussions']
        for discussion in connection['nodes']:
            matched = next((vid for digest, vid in hashes.items() if digest in discussion['body']), None)
            if not matched:
                match = re.fullmatch(r'dayday-video-(v\d+)', discussion['title'])
                matched = match.group(1) if match and match.group(1) in known else None
            if not matched:
                continue
            parents, after, total, replies = [], None, 0, 0
            while True:
                page = graphql(comment_query, {'id': discussion['id'], 'after': after}, token)['node']['comments']
                total = page['totalCount']
                for comment in page['nodes']:
                    reply_data = comment.pop('replies')
                    replies += reply_data['totalCount']
                    comment['replyCount'] = reply_data['totalCount']
                    comment['replies'] = reply_data['nodes']
                    parents.append(comment)
                if not page['pageInfo']['hasNextPage']:
                    break
                after = page['pageInfo']['endCursor']
                if not after:
                    raise RuntimeError('Comment pagination cursor missing')
            result[matched] = {'count': total + replies, 'parents': parents, 'discussionURL': discussion['url']}
        if not connection['pageInfo']['hasNextPage']:
            break
        cursor = connection['pageInfo']['endCursor']
        if not cursor:
            raise RuntimeError('Discussion pagination cursor missing')
    return result


def public_video(video):
    """Bootstrap locally through Giscus without using or storing a token."""
    after, parents, total, replies, discussion_url = None, [], 0, 0, None
    while True:
        params = {'repo': REPO, 'term': f"dayday-video-{video['id']}", 'category': 'Announcements', 'strict': 'true', 'first': 50}
        if after:
            params['after'] = after
        data = request_json('https://giscus.app/api/discussions?' + urlencode(params))
        if data.get('error') == 'Discussion not found':
            return video['id'], {'count': 0, 'parents': []}
        if 'discussion' not in data:
            raise RuntimeError(f"Cannot read comments for {video['id']}")
        d = data['discussion']
        parents.extend(d['comments'])
        total = d['totalCommentCount']
        replies += d.get('totalReplyCount', 0)
        discussion_url = d['url']
        if not d['pageInfo']['hasNextPage']:
            break
        after = d['pageInfo']['endCursor']
        if not after:
            raise RuntimeError('Comment pagination cursor missing')
    return video['id'], {'count': total + replies, 'parents': parents, 'discussionURL': discussion_url}


def main():
    token = os.environ.get('GITHUB_TOKEN')
    if token:
        data = github_data(token)
    else:
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            data = dict(executor.map(public_video, VIDEOS))
    output = {'version': 1, 'generatedAt': datetime.now(timezone.utc).isoformat(), 'videos': data}
    (ROOT / 'comment-data.json').write_text(json.dumps(output, ensure_ascii=False, indent=2))
    print(f"Built comment data for {len(data)} videos ({sum(v['count'] for v in data.values())} comments and replies).")


if __name__ == '__main__':
    main()
