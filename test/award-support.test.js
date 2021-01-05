// @ts-check

import { test } from 'uvu';
import * as assert from 'uvu/assert';

import { extractAwardees } from '../dist/commands/award-support';

function filterTestCases(cases) {
    let filtered = cases.filter((c) => c.only);

    if (filtered.length === 0) {
        filtered = cases;
    }

    return filtered;
}

function at(userId) {
    return `<@${userId}|j.paye96>`;
}

test('extractAwardees() throws for input with no awardee', () => {
    const cases = [
        '',
        'lots of stuff @ but nothing good @-a @',
        '(stuff here), but (nothing good (, ok then @ 20)',
        '()',
        '(((()',
    ];

    for (const testCase of filterTestCases(cases)) {
        try {
            extractAwardees(testCase);
            assert.unreachable(`did not throw for input "${testCase}"`);
        } catch (err) {
            assert.is(err.type, 'NO_AWARDEE');
        }
    }
});

test('extractAwardees() extracts awardees without groups', () => {
    const cases = [
        {
            input: `${at('a')}`,
            expected: [['a']],
        },
        {
            input: `   ${at('a')}   ${at('b')}   `,
            expected: [['a'], ['b']],
        },
        {
            input: `   ${at('a')}   ${at('b')} ${at('c')}   `,
            expected: [['a'], ['b'], ['c']],
        },
    ];

    for (const testCase of filterTestCases(cases)) {
        assert.equal(
            extractAwardees(testCase.input),
            testCase.expected,
            `matches "${testCase.input}" correctly`
        );
    }
});

test('extractAwardees() extracts awardees with groups', () => {
    const cases = [
        {
            // dedupes in the same group
            input: `${at('a')}${at('a')}`,
            expected: [['a']],
        },
        {
            // delimiter in a group is optional
            input: `${at('a')}${at('b')}`,
            expected: [['a', 'b']],
        },
        {
            // delimiter in a group can be basically anything except space
            input: `${at('a')}/${at('b')},${at('c')}`,
            expected: [['a', 'b', 'c']],
        },
        {
            // groups and non-groups can be mixed
            input: `${at('_a')} ${at('a')}/${at('b')},${at('c')} ${at('d')}`,
            expected: [['_a'], ['a', 'b', 'c'], ['d']],
        },
        {
            // max 3 per group, max 3 groups
            input: `${at('_a')} ${at('a')}/${at('b')},${at('c')}-${at(
                'd'
            )} ${at('e')} ${at('f')}${at('g')}`,
            expected: [['_a'], ['a', 'b', 'c'], ['e']],
        },
        {
            // ignores empty groups
            input: `x y z,as,d ${at('_a')} ,qed, @,@ ${at('a')}///${at(
                'b'
            )}},, ; something @ without name ${at('c')}`,
            expected: [['_a'], ['a', 'b'], ['c']],
        },
    ];

    for (const testCase of filterTestCases(cases)) {
        assert.equal(
            extractAwardees(testCase.input),
            testCase.expected,
            `matches "${testCase.input}" correctly`
        );
    }
});

test.run();
