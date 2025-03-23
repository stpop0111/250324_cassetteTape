import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { MODEL_DATA } from "./Model.js";

document.addEventListener('DOMContentLoaded', () => {
    const cassetteModel = new CassetteModel();
})

class CassetteModel{
    constructor(){
        this.container = document.querySelector('.modelViewer');

        //必要な要素を宣言（カメラ、シーン、ローダー、レンダラー）
        this.camera = null;
        this.scene = null;
        this.loader = null;
        this.renderer = null;

        //モデルを格納する変数
        this.model = null;

        //モデルデータを配列に変換
        this.modelDataArray = Object.values(MODEL_DATA);
        this.models = [];
        this.modelGroup = new THREE.Group();

        this.init();
    }

    init(){
        this.setupScene();
        this.setupRenderer();
        this.setupCamera();
        this.setupLights();
        this.setupEnviroment();
        this.setupModelGrpup();
        this.setupLoadModel();
        this.setupResizehandle();
        this.setupAnimation();
    }

    /*シーンの作成
    =============================*/
    setupScene(){
        this.scene = new THREE.Scene();
        this.scene.background = null;
    }

    /*レンダラーの作成
    =============================*/
    setupRenderer(){
        this.renderer = new THREE.WebGLRenderer({
            antialias: true, //アンチエイリアス
            alpha: true, //透過
        });

        this.renderer.setSize( //レンダラーのサイズを指定
            this.container.clientWidth,
            this.container.clientHeight
        );

        this.container.appendChild(this.renderer.domElement); //取得要素の子要素として追加
    }

    /*リサイズ処理
    =============================*/
    setupResizehandle(){
        window.addEventListener('resize', () => {
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;

            this.renderer.setSize(width, height); //レンダラーのサイズを変更
            this.camera.aspect = width / height; //カメラのサイズを変更

            this.camera.updateProjectionMatrix();
        })
    }

    /*カメラの作成
    =============================*/
    setupCamera(){
        const aspect = this.container.clientWidth / this.container.clientHeight; //縦横比を要素から取得
        this.camera = new THREE.PerspectiveCamera(
            25, //視野角75°
            aspect, //カメラ比率を要素の縦横比
            0.1, //カメラの最短描画距離
            1000 //カメラの最長描画距離
        );

        this.camera.position.set(0, 0, 20);
    }

    /*環境テクスチャのロード
    =============================*/
    setupEnviroment(){
        const exrLoader = new EXRLoader();
        exrLoader.load('./exr/sky-image.exr', (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                this.scene.environment = texture;
                this.scene.background = null;
            },
            undefined,(error) => {console.error('環境テクスチャの読み込みエラー:',error);}
        );
    }

    /*モデルグループの作成
    =============================*/
    setupModelGrpup(){
        this.scene.add(this.modelGroup);
        this.modelGroup.rotation.y = THREE.MathUtils.degToRad(-6); //モデルグループのY軸を回転
    }

    /*モデルのロード
    =============================*/
    setupLoadModel(){
        this.loader = new GLTFLoader();

        this.modelDataArray.forEach((modelData, i )=> {
            this.loader.load(modelData.path, (gltf) => {
                const model = gltf.scene;

                model.traverse((child) => {
                    if(child.isMesh){
                        const material = child.material; //マテリアルを取得
                        
                        //マテリアルがテクスチャを持っている場合
                        if(material.map){
                            material.transparent = true; //透過を有効にする
                            material.alphaTest = 0.1; //アルファテストを設定
                            material.side = THREE.DoubleSide; //両面描画を有効にする
                            material.depthWrite = true; //デプスバッファを有効にする
                            material.needsUpdate = true; //マテリアルを更新
                        }
                        
                    }
                });

                model.position.set(0, 0, i * -0.5); //モデルの位置を設定
                this.modelGroup.add(model); //モデルをグループに追加

                //モデルを配列に格納
                this.models.push({
                    model: model, //モデルデータ
                    id: modelData.id, //モデルID
                    index: i, //モデルのインデックス
                });

                console.log(`モデル${modelData.id}の読み込み完了`);     
            },
            (progress) => {
                console.log(`モデル${modelData.id}の読み込み中:,${(progress.loaded / progress.total) * 100}%`);
            }
            ,(error) => {
                console.error('モデルの読み込みエラー:',error);
            });
        });
    }

    /*ライトの作成
    =============================*/
    setupLights() {
        // 環境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 5);
        this.scene.add(ambientLight);

        // 方向光源
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(0, 0, 5);
        this.scene.add(directionalLight);
        
        // 追加光源（Y軸回転に合わせて配置）
        const sideLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sideLight.position.set(5, 0, 0);
        this.scene.add(sideLight);
    }

    setupAnimation(){
        this.animate();
    }

    /*アニメーションループ
    =============================*/ 
    animate() {
        requestAnimationFrame(this.animate.bind(this)); //アニメーションをリクエスト
        
        this.renderer.render(this.scene, this.camera); //レンダリング
    }
}