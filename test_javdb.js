// 测试JavDB爬虫功能
import { reqJavdb } from './src/utils/javdb.js'

async function testJavdb() {
    console.log('='.repeat(60))
    console.log('测试JavDB爬虫功能')
    console.log('='.repeat(60))

    const testCases = [
        { code: '010126_01', desc: '纯数字格式番号' },
        { code: 'ssni-888', desc: '标准格式番号' },
        { code: 'abc-999', desc: '不存在的番号(测试错误处理)' }
    ]

    for (const testCase of testCases) {
        console.log(`\n测试: ${testCase.desc} - ${testCase.code}`)
        console.log('-'.repeat(60))

        try {
            const result = await reqJavdb(testCase.code)

            console.log(`✓ 标题: ${result.title}`)
            console.log(`✓ 封面: ${result.cover ? '已获取' : '未找到'}`)
            console.log(`✓ 磁力链接数量: ${result.magnet.length}`)
            console.log(`✓ 截图数量: ${result.screenshots.length}`)

            if (result.magnet.length > 0) {
                console.log(`\n前3个磁力链接:`)
                result.magnet.slice(0, 3).forEach((m, i) => {
                    console.log(`  ${i + 1}. 大小: ${m.size}, 日期: ${m.dateTime}`)
                    console.log(`     HD: ${m.is_hd || '否'}, 字幕: ${m.has_subtitle || '否'}`)
                })
            }

            console.log(`\n✓ 测试通过`)
        } catch (error) {
            console.log(`✗ 测试失败: ${error.message}`)
        }
    }

    console.log('\n' + '='.repeat(60))
    console.log('测试完成')
    console.log('='.repeat(60))
}

testJavdb()
