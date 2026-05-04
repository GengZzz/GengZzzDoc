import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import CArrayPointerDemo from './components/CArrayPointerDemo.vue'
import CMemoryLayoutDemo from './components/CMemoryLayoutDemo.vue'
import CPointerMemoryDemo from './components/CPointerMemoryDemo.vue'
import CSocketCommDemo from './components/CSocketCommDemo.vue'
import CppAlgorithmSortDemo from './components/CppAlgorithmSortDemo.vue'
import CppConcurrencyDemo from './components/CppConcurrencyDemo.vue'
import CppMoveSemanticsDemo from './components/CppMoveSemanticsDemo.vue'
import CppSmartPointerDemo from './components/CppSmartPointerDemo.vue'
import CppArrayIndexDemo from './components/CppArrayIndexDemo.vue'
import CppClassObjectDemo from './components/CppClassObjectDemo.vue'
import CppCompileFlow from './components/CppCompileFlow.vue'
import CppInheritancePolymorphismDemo from './components/CppInheritancePolymorphismDemo.vue'
import CppPointerAddressDemo from './components/CppPointerAddressDemo.vue'
import CppStackHeapDemo from './components/CppStackHeapDemo.vue'
import CppVectorGrowthDemo from './components/CppVectorGrowthDemo.vue'
import JavaConcurrencyDemo from './components/JavaConcurrencyDemo.vue'
import JavaGCProcessDemo from './components/JavaGCProcessDemo.vue'
import JavaInheritanceChainDemo from './components/JavaInheritanceChainDemo.vue'
import JavaInterfaceVsAbstractDemo from './components/JavaInterfaceVsAbstractDemo.vue'
import JavaObjectMemoryDemo from './components/JavaObjectMemoryDemo.vue'
import JavaPolymorphismDemo from './components/JavaPolymorphismDemo.vue'
import JavaStreamPipelineDemo from './components/JavaStreamPipelineDemo.vue'
import MySQLBPlusTreeDemo from './components/MySQLBPlusTreeDemo.vue'
import MySQLLockDemo from './components/MySQLLockDemo.vue'
import MySQLMvccDemo from './components/MySQLMvccDemo.vue'
import MySQLQueryExecutionDemo from './components/MySQLQueryExecutionDemo.vue'
import MySQLReplicationDemo from './components/MySQLReplicationDemo.vue'
import MySQLShardingDemo from './components/MySQLShardingDemo.vue'
import RedisDataStructureDemo from './components/RedisDataStructureDemo.vue'
import RedisClusterDemo from './components/RedisClusterDemo.vue'
import RedisPersistenceDemo from './components/RedisPersistenceDemo.vue'
import MongoReplicaSetDemo from './components/MongoReplicaSetDemo.vue'
import MongoShardingDemo from './components/MongoShardingDemo.vue'
import MongoAggregationDemo from './components/MongoAggregationDemo.vue'
import EsInvertedIndexDemo from './components/EsInvertedIndexDemo.vue'
import EsWriteProcessDemo from './components/EsWriteProcessDemo.vue'
import EsClusterDemo from './components/EsClusterDemo.vue'
import PgMvccDemo from './components/PgMvccDemo.vue'
import PgQueryPlannerDemo from './components/PgQueryPlannerDemo.vue'
import PgReplicationDemo from './components/PgReplicationDemo.vue'
import CSharpGCDemo from './components/CSharpGCDemo.vue'
import CSharpAsyncDemo from './components/CSharpAsyncDemo.vue'
import CSharpLINQDemo from './components/CSharpLINQDemo.vue'
import PythonGeneratorDemo from './components/PythonGeneratorDemo.vue'
import PythonDecoratorDemo from './components/PythonDecoratorDemo.vue'
import PythonAsyncDemo from './components/PythonAsyncDemo.vue'
import PhpZvalDemo from './components/PhpZvalDemo.vue'
import PhpRequestLifecycleDemo from './components/PhpRequestLifecycleDemo.vue'
import PhpOpcacheDemo from './components/PhpOpcacheDemo.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('CArrayPointerDemo', CArrayPointerDemo)
    app.component('CMemoryLayoutDemo', CMemoryLayoutDemo)
    app.component('CPointerMemoryDemo', CPointerMemoryDemo)
    app.component('CSocketCommDemo', CSocketCommDemo)
    app.component('CppAlgorithmSortDemo', CppAlgorithmSortDemo)
    app.component('CppArrayIndexDemo', CppArrayIndexDemo)
    app.component('CppConcurrencyDemo', CppConcurrencyDemo)
    app.component('CppClassObjectDemo', CppClassObjectDemo)
    app.component('CppCompileFlow', CppCompileFlow)
    app.component('CppInheritancePolymorphismDemo', CppInheritancePolymorphismDemo)
    app.component('CppMoveSemanticsDemo', CppMoveSemanticsDemo)
    app.component('CppPointerAddressDemo', CppPointerAddressDemo)
    app.component('CppSmartPointerDemo', CppSmartPointerDemo)
    app.component('CppStackHeapDemo', CppStackHeapDemo)
    app.component('CppVectorGrowthDemo', CppVectorGrowthDemo)
    app.component('JavaConcurrencyDemo', JavaConcurrencyDemo)
    app.component('JavaGCProcessDemo', JavaGCProcessDemo)
    app.component('JavaInheritanceChainDemo', JavaInheritanceChainDemo)
    app.component('JavaInterfaceVsAbstractDemo', JavaInterfaceVsAbstractDemo)
    app.component('JavaObjectMemoryDemo', JavaObjectMemoryDemo)
    app.component('JavaPolymorphismDemo', JavaPolymorphismDemo)
    app.component('JavaStreamPipelineDemo', JavaStreamPipelineDemo)
    app.component('MySQLBPlusTreeDemo', MySQLBPlusTreeDemo)
    app.component('MySQLLockDemo', MySQLLockDemo)
    app.component('MySQLMvccDemo', MySQLMvccDemo)
    app.component('MySQLQueryExecutionDemo', MySQLQueryExecutionDemo)
    app.component('MySQLReplicationDemo', MySQLReplicationDemo)
    app.component('MySQLShardingDemo', MySQLShardingDemo)
    app.component('RedisDataStructureDemo', RedisDataStructureDemo)
    app.component('RedisClusterDemo', RedisClusterDemo)
    app.component('RedisPersistenceDemo', RedisPersistenceDemo)
    app.component('MongoReplicaSetDemo', MongoReplicaSetDemo)
    app.component('MongoShardingDemo', MongoShardingDemo)
    app.component('MongoAggregationDemo', MongoAggregationDemo)
    app.component('EsInvertedIndexDemo', EsInvertedIndexDemo)
    app.component('EsWriteProcessDemo', EsWriteProcessDemo)
    app.component('EsClusterDemo', EsClusterDemo)
    app.component('PgMvccDemo', PgMvccDemo)
    app.component('PgQueryPlannerDemo', PgQueryPlannerDemo)
    app.component('PgReplicationDemo', PgReplicationDemo)
    app.component('CSharpGCDemo', CSharpGCDemo)
    app.component('CSharpAsyncDemo', CSharpAsyncDemo)
    app.component('CSharpLINQDemo', CSharpLINQDemo)
    app.component('PythonGeneratorDemo', PythonGeneratorDemo)
    app.component('PythonDecoratorDemo', PythonDecoratorDemo)
    app.component('PythonAsyncDemo', PythonAsyncDemo)
    app.component('PhpZvalDemo', PhpZvalDemo)
    app.component('PhpRequestLifecycleDemo', PhpRequestLifecycleDemo)
    app.component('PhpOpcacheDemo', PhpOpcacheDemo)
  }
}
