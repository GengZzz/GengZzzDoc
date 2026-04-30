import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import CppAlgorithmSortDemo from './components/CppAlgorithmSortDemo.vue'
import CppArrayIndexDemo from './components/CppArrayIndexDemo.vue'
import CppClassObjectDemo from './components/CppClassObjectDemo.vue'
import CppCompileFlow from './components/CppCompileFlow.vue'
import CppInheritancePolymorphismDemo from './components/CppInheritancePolymorphismDemo.vue'
import CppPointerAddressDemo from './components/CppPointerAddressDemo.vue'
import CppStackHeapDemo from './components/CppStackHeapDemo.vue'
import CppVectorGrowthDemo from './components/CppVectorGrowthDemo.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('CppAlgorithmSortDemo', CppAlgorithmSortDemo)
    app.component('CppArrayIndexDemo', CppArrayIndexDemo)
    app.component('CppClassObjectDemo', CppClassObjectDemo)
    app.component('CppCompileFlow', CppCompileFlow)
    app.component('CppInheritancePolymorphismDemo', CppInheritancePolymorphismDemo)
    app.component('CppPointerAddressDemo', CppPointerAddressDemo)
    app.component('CppStackHeapDemo', CppStackHeapDemo)
    app.component('CppVectorGrowthDemo', CppVectorGrowthDemo)
  }
}
