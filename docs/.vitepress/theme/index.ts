import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import CArrayPointerDemo from './components/CArrayPointerDemo.vue'
import CHeapLifecycleDemo from './components/CHeapLifecycleDemo.vue'
import CMemoryLayoutDemo from './components/CMemoryLayoutDemo.vue'
import CPointerMemoryDemo from './components/CPointerMemoryDemo.vue'
import CPointerArithmeticDemo from './components/CPointerArithmeticDemo.vue'
import CStackFrameOverflowDemo from './components/CStackFrameOverflowDemo.vue'
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
import CppRAIIDemo from './components/CppRAIIDemo.vue'
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
import CSharpDelegateEventDemo from './components/CSharpDelegateEventDemo.vue'
import CSharpLINQDemo from './components/CSharpLINQDemo.vue'
import PythonGeneratorDemo from './components/PythonGeneratorDemo.vue'
import PythonDecoratorDemo from './components/PythonDecoratorDemo.vue'
import PythonAsyncDemo from './components/PythonAsyncDemo.vue'
import PhpZvalDemo from './components/PhpZvalDemo.vue'
import PhpRequestLifecycleDemo from './components/PhpRequestLifecycleDemo.vue'
import PhpOpcacheDemo from './components/PhpOpcacheDemo.vue'
import HtmlRenderPipelineDemo from './components/HtmlRenderPipelineDemo.vue'
import HtmlShadowDomDemo from './components/HtmlShadowDomDemo.vue'
import JsEventLoopDemo from './components/JsEventLoopDemo.vue'
import JsPromiseChainDemo from './components/JsPromiseChainDemo.vue'
import JsPrototypeChainDemo from './components/JsPrototypeChainDemo.vue'
import JsClosureScopeDemo from './components/JsClosureScopeDemo.vue'
import JsAsyncConcurrencyDemo from './components/JsAsyncConcurrencyDemo.vue'
import JsMemoryLifecycleDemo from './components/JsMemoryLifecycleDemo.vue'
import JsThisBindingDemo from './components/JsThisBindingDemo.vue'
import JsModuleLoadingDemo from './components/JsModuleLoadingDemo.vue'
import JsTypeCoercionDemo from './components/JsTypeCoercionDemo.vue'
import OsCacheMappingDemo from './components/OsCacheMappingDemo.vue'
import OsPageReplacementDemo from './components/OsPageReplacementDemo.vue'
import OsPipelineDemo from './components/OsPipelineDemo.vue'
import OsPVDemo from './components/OsPVDemo.vue'
import CssAnimationPlayground from './components/CssAnimationPlayground.vue'
import CssBoxModelDemo from './components/CssBoxModelDemo.vue'
import CssFlexboxDemo from './components/CssFlexboxDemo.vue'
import CssGridLayoutDemo from './components/CssGridLayoutDemo.vue'
import CssPositioningDemo from './components/CssPositioningDemo.vue'
import CssSelectorCascadeDemo from './components/CssSelectorCascadeDemo.vue'
import CssSelectorDemo from './components/CssSelectorDemo.vue'
import CssTransformDemo from './components/CssTransformDemo.vue'
import CssTransitionDemo from './components/CssTransitionDemo.vue'
import TsGenericsDemo from './components/TsGenericsDemo.vue'
import TsTypeInferenceDemo from './components/TsTypeInferenceDemo.vue'
import TsTypeSystemDemo from './components/TsTypeSystemDemo.vue'
import GitHubActionsWorkflowDemo from './components/GitHubActionsWorkflowDemo.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('CArrayPointerDemo', CArrayPointerDemo)
    app.component('CHeapLifecycleDemo', CHeapLifecycleDemo)
    app.component('CMemoryLayoutDemo', CMemoryLayoutDemo)
    app.component('CPointerMemoryDemo', CPointerMemoryDemo)
    app.component('CPointerArithmeticDemo', CPointerArithmeticDemo)
    app.component('CStackFrameOverflowDemo', CStackFrameOverflowDemo)
    app.component('CSocketCommDemo', CSocketCommDemo)
    app.component('CppAlgorithmSortDemo', CppAlgorithmSortDemo)
    app.component('CppArrayIndexDemo', CppArrayIndexDemo)
    app.component('CppConcurrencyDemo', CppConcurrencyDemo)
    app.component('CppClassObjectDemo', CppClassObjectDemo)
    app.component('CppCompileFlow', CppCompileFlow)
    app.component('CppInheritancePolymorphismDemo', CppInheritancePolymorphismDemo)
    app.component('CppMoveSemanticsDemo', CppMoveSemanticsDemo)
    app.component('CppPointerAddressDemo', CppPointerAddressDemo)
    app.component('CppRAIIDemo', CppRAIIDemo)
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
    app.component('CSharpDelegateEventDemo', CSharpDelegateEventDemo)
    app.component('CSharpLINQDemo', CSharpLINQDemo)
    app.component('PythonGeneratorDemo', PythonGeneratorDemo)
    app.component('PythonDecoratorDemo', PythonDecoratorDemo)
    app.component('PythonAsyncDemo', PythonAsyncDemo)
    app.component('PhpZvalDemo', PhpZvalDemo)
    app.component('PhpRequestLifecycleDemo', PhpRequestLifecycleDemo)
    app.component('PhpOpcacheDemo', PhpOpcacheDemo)
    app.component('HtmlRenderPipelineDemo', HtmlRenderPipelineDemo)
    app.component('HtmlShadowDomDemo', HtmlShadowDomDemo)
    app.component('JsEventLoopDemo', JsEventLoopDemo)
    app.component('JsPromiseChainDemo', JsPromiseChainDemo)
    app.component('JsPrototypeChainDemo', JsPrototypeChainDemo)
    app.component('JsClosureScopeDemo', JsClosureScopeDemo)
    app.component('JsAsyncConcurrencyDemo', JsAsyncConcurrencyDemo)
    app.component('JsMemoryLifecycleDemo', JsMemoryLifecycleDemo)
    app.component('JsThisBindingDemo', JsThisBindingDemo)
    app.component('JsModuleLoadingDemo', JsModuleLoadingDemo)
    app.component('JsTypeCoercionDemo', JsTypeCoercionDemo)
    app.component('OsCacheMappingDemo', OsCacheMappingDemo)
    app.component('OsPageReplacementDemo', OsPageReplacementDemo)
    app.component('OsPipelineDemo', OsPipelineDemo)
    app.component('OsPVDemo', OsPVDemo)
    app.component('CssAnimationPlayground', CssAnimationPlayground)
    app.component('CssBoxModelDemo', CssBoxModelDemo)
    app.component('CssFlexboxDemo', CssFlexboxDemo)
    app.component('CssGridLayoutDemo', CssGridLayoutDemo)
    app.component('CssPositioningDemo', CssPositioningDemo)
    app.component('CssSelectorCascadeDemo', CssSelectorCascadeDemo)
    app.component('CssSelectorDemo', CssSelectorDemo)
    app.component('CssTransformDemo', CssTransformDemo)
    app.component('CssTransitionDemo', CssTransitionDemo)
    app.component('TsGenericsDemo', TsGenericsDemo)
    app.component('TsTypeInferenceDemo', TsTypeInferenceDemo)
    app.component('TsTypeSystemDemo', TsTypeSystemDemo)
    app.component('GitHubActionsWorkflowDemo', GitHubActionsWorkflowDemo)
  }
}
