// 测试番号正则表达式
console.log('='.repeat(60))
console.log('测试番号格式正则表达式')
console.log('='.repeat(60))

// 支持多种番号格式:
// 1. 字母+数字: ssni-888, ssni_888, ssni 888
// 2. 纯数字+下划线: 010126_01, 123456_99
const codeRegex = /^([a-z]+)(?:-|_|\s)?([0-9]+)$|^(\d{6})_(\d{2})$/

const testCases = [
    { input: 'ssni888', expected: 'ssni-888', desc: '字母+数字(无分隔符)' },
    { input: 'ssni-888', expected: 'ssni-888', desc: '字母+数字(连字符)' },
    { input: 'ssni_888', expected: 'ssni-888', desc: '字母+数字(下划线)' },
    { input: 'ssni 888', expected: 'ssni-888', desc: '字母+数字(空格)' },
    { input: '010126_01', expected: '010126_01', desc: '纯数字格式(6位+2位)' },
    { input: '123456_99', expected: '123456_99', desc: '纯数字格式(6位+2位)' },
    { input: 'abc123', expected: 'abc-123', desc: '字母+数字(无分隔符)' },
    { input: 'invalid', expected: null, desc: '无效格式' },
    { input: '12345_01', expected: null, desc: '无效格式(5位数字)' }
]

console.log('\n测试用例:')
console.log('-'.repeat(60))

let passed = 0
let failed = 0

testCases.forEach((testCase, index) => {
    const { input, expected, desc } = testCase

    let result = input
    if (codeRegex.test(input)) {
        const match = input.match(codeRegex)
        if (match[1] && match[2]) {
            // 字母+数字格式
            result = match[1] + '-' + match[2]
        } else if (match[3] && match[4]) {
            // 纯数字格式
            result = match[3] + '_' + match[4]
        }
    } else {
        result = null
    }

    const isPass = result === expected
    const status = isPass ? '✓ 通过' : '✗ 失败'

    if (isPass) {
        passed++
    } else {
        failed++
    }

    console.log(`${index + 1}. ${status} - ${desc}`)
    console.log(`   输入: "${input}"`)
    console.log(`   期望: ${expected === null ? 'null' : `"${expected}"`}`)
    console.log(`   实际: ${result === null ? 'null' : `"${result}"`}`)
    console.log()
})

console.log('='.repeat(60))
console.log(`测试结果: ${passed} 通过, ${failed} 失败`)
console.log('='.repeat(60))

if (failed === 0) {
    console.log('✓ 所有测试通过!')
} else {
    console.log('✗ 部分测试失败,请检查正则表达式')
    process.exit(1)
}
