#!/bin/bash
# 画说数据同步脚本
# 用法: ./sync_to_cloud.sh [artworks|artists|museums|all]
# 示例: ./sync_to_cloud.sh artists

ENV_ID="cloudbase-d7gl3kh5vf6b71edc"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-all}"

sync_collection() {
    local collection=$1
    local json_file=$2
    
    echo "📦 同步集合: $collection"
    echo "   文件: $json_file"
    
    # 逐行读取JSON，每条记录单独upsert
    local count=0
    local success=0
    local failed=0
    
    while IFS= read -r line; do
        [ -z "$line" ] && continue
        count=$((count + 1))
        
        # 提取 _id
        local id=$(echo "$line" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['_id'])")
        
        # 用 tcb 命令执行 upsert
        result=$(tcb env:db:query \
            --envId "$ENV_ID" \
            --query "db.collection('$collection').doc('$id').set({data: $(echo $line)})" \
            2>&1)
        
        if echo "$result" | grep -q "error\|Error\|失败"; then
            failed=$((failed + 1))
            echo "   ❌ $id"
        else
            success=$((success + 1))
            printf "."
        fi
    done < "$json_file"
    
    echo ""
    echo "   ✅ 完成: 成功 $success 条, 失败 $failed 条, 共 $count 条"
}

case "$TARGET" in
    artworks)
        sync_collection "artworks" "$SCRIPTS_DIR/artworks_data.json"
        ;;
    artists)
        sync_collection "artists" "$SCRIPTS_DIR/artists_data.json"
        ;;
    museums)
        sync_collection "museums" "$SCRIPTS_DIR/museums_data.json"
        ;;
    all)
        sync_collection "artworks" "$SCRIPTS_DIR/artworks_data.json"
        sync_collection "artists" "$SCRIPTS_DIR/artists_data.json"
        sync_collection "museums" "$SCRIPTS_DIR/museums_data.json"
        ;;
    *)
        echo "用法: $0 [artworks|artists|museums|all]"
        exit 1
        ;;
esac

echo "✅ 同步完成"
