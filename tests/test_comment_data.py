import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('comment_builder', Path(__file__).parents[1] / 'scripts/build_comment_data.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def comment(id, replies=0):
    return {'id': id, 'author': {'login': 'dancer'}, 'bodyHTML': '<p>Nice dance</p>', 'createdAt': '2026-01-01T00:00:00Z', 'url': 'https://github.com/example/discussions/1', 'isMinimized': False, 'deletedAt': None, 'replies': {'totalCount': replies, 'nodes': []}}


class CommentDataTests(unittest.TestCase):
    def test_pagination_counts_replies_and_renamed_discussion(self):
        digest = builder.hashlib.sha1(b'dayday-video-v00').hexdigest()
        pages = [
            {'repository': {'discussions': {'nodes': [{'id': 'discussion', 'title': 'A renamed discussion', 'body': f'<!-- sha1: {digest} -->', 'url': 'https://github.com/example/discussions/1'}], 'pageInfo': {'hasNextPage': False, 'endCursor': None}}}},
            {'node': {'comments': {'totalCount': 2, 'nodes': [comment('one', 2)], 'pageInfo': {'hasNextPage': True, 'endCursor': 'next'}}}},
            {'node': {'comments': {'totalCount': 2, 'nodes': [comment('two', 3)], 'pageInfo': {'hasNextPage': False, 'endCursor': None}}}},
        ]
        with patch.object(builder, 'graphql', side_effect=pages) as graphql:
            result = builder.github_data('test-token')
        self.assertEqual(result['v00']['count'], 7)
        self.assertEqual(len(result['v00']['parents']), 2)
        self.assertEqual(result['v00']['parents'][1]['replyCount'], 3)
        self.assertEqual(graphql.call_args_list[2].args[1]['after'], 'next')
        self.assertEqual(result['v01']['count'], 0)

    def test_unrelated_discussions_are_excluded(self):
        data = {'repository': {'discussions': {'nodes': [{'id': 'other', 'title': 'General feedback', 'body': 'Hello', 'url': 'https://github.com/example/discussions/2'}], 'pageInfo': {'hasNextPage': False, 'endCursor': None}}}}
        with patch.object(builder, 'graphql', return_value=data):
            result = builder.github_data('test-token')
        self.assertTrue(all(v['count'] == 0 for v in result.values()))

    def test_missing_pagination_cursor_fails_instead_of_publishing_incomplete_data(self):
        data = {'repository': {'discussions': {'nodes': [], 'pageInfo': {'hasNextPage': True, 'endCursor': None}}}}
        with patch.object(builder, 'graphql', return_value=data):
            with self.assertRaises(RuntimeError):
                builder.github_data('test-token')


if __name__ == '__main__':
    unittest.main()
